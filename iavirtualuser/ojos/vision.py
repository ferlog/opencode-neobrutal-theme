"""Visión: encuentra imágenes y botones dentro de una captura de pantalla.

Usa coincidencia de plantillas (template matching) de OpenCV para localizar
imágenes, iconos o regiones de botón, y devuelve sus coordenadas de pantalla.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Sequence

import cv2
import numpy as np
from PIL import Image


@dataclass(frozen=True)
class ObjetoDetectado:
    """Elemento (imagen/logotipo/botón) encontrado en la pantalla."""

    nombre: str
    x: int
    y: int
    ancho: int
    alto: int
    confianza: float

    @property
    def centro(self) -> tuple[int, int]:
        return (self.x + self.ancho // 2, self.y + self.alto // 2)

    @property
    def caja(self) -> tuple[int, int, int, int]:
        return (self.x, self.y, self.x + self.ancho, self.y + self.alto)

    def __repr__(self) -> str:
        return (f"ObjetoDetectado({self.nombre!r} @ "
                f"({self.x},{self.y} {self.ancho}x{self.alto}) "
                f"conf={self.confianza:.2f})")


class Vision:
    """Reconoce imágenes de referencia (plantillas) y botones en pantalla.

    Las plantillas son imágenes PNG guardadas en disco (por ejemplo en la
    carpeta assets/) que representan el icono o botón buscado, típicamente
    con fondo transparente.
    """

    def __init__(self, umbral: float = 0.8) -> None:
        self.umbral = umbral

    def _a_bgr(self, img) -> np.ndarray:
        """Acepta PIL Image o array numpy y devuelve BGR (uint8)."""
        if isinstance(img, np.ndarray):
            if img.dtype != np.uint8:
                img = np.clip(img, 0, 255).astype(np.uint8)
            if img.ndim == 2:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
            return img.copy()
        return np.array(img.convert("RGB"))[:, :, ::-1]

    def buscar_plantilla(
        self,
        pantalla: np.ndarray,
        plantilla: np.ndarray | str,
        umbral: Optional[float] = None,
        offset: tuple[int, int] = (0, 0),
    ) -> Optional[ObjetoDetectado]:
        """Busca una plantilla dentro de la pantalla.

        pantalla: array numpy (H, W, 3) BGR de la captura.
        plantilla: array numpy o ruta a una imagen PNG.
        Devuelve el mejor match o None si no supera el umbral.
        """
        pantalla_bgr = self._a_bgr(pantalla)
        if isinstance(plantilla, str):
            plantilla_bgr = cv2.imread(plantilla, cv2.IMREAD_UNCHANGED)
            if plantilla_bgr is None:
                raise FileNotFoundError(f"No se pudo leer la plantilla: {plantilla}")
        else:
            plantilla_bgr = self._a_bgr(plantilla)

        th = umbral if umbral is not None else self.umbral

        # Si la plantilla trae canal alfa, usar coincidencia enmascarada.
        if plantilla_bgr.ndim == 3 and plantilla_bgr.shape[2] == 4:
            bgr = plantilla_bgr[:, :, :3]
            alfa = plantilla_bgr[:, :, 3]
            resultado = cv2.matchTemplate(
                pantalla_bgr, bgr, cv2.TM_CCORR_NORMED, mask=alfa
            )
        else:
            resultado = cv2.matchTemplate(
                pantalla_bgr, plantilla_bgr, cv2.TM_CCOEFF_NORMED
            )

        min_v, max_v, _, max_loc = cv2.minMaxLoc(resultado)
        if max_v < th:
            return None

        ox, oy = offset
        h, w = plantilla_bgr.shape[:2]
        return ObjetoDetectado(
            nombre="plantilla",
            x=max_loc[0] + ox,
            y=max_loc[1] + oy,
            ancho=w,
            alto=h,
            confianza=float(max_v),
        )

    def buscar_imagen(
        self,
        pantalla: np.ndarray,
        plantilla: np.ndarray | str,
        nombre: str = "imagen",
        umbral: Optional[float] = None,
        offset: tuple[int, int] = (0, 0),
    ) -> Optional[ObjetoDetectado]:
        """Alias legible de buscar_plantilla para 'encontrar una imagen'."""
        return self.buscar_plantilla(pantalla, plantilla, umbral, offset)

    def buscar_todas(
        self,
        pantalla: np.ndarray,
        plantilla: np.ndarray | str,
        nombre: str = "objeto",
        umbral: Optional[float] = None,
        offset: tuple[int, int] = (0, 0),
        maximo: int = 10,
        nms_u: float = 0.3,
    ) -> list[ObjetoDetectado]:
        """Busca todos los matches de la plantilla en la pantalla.

        Aplica supresión de no máximos (NMS) para evitar duplicados sobre
        el mismo objeto.
        """
        pantalla_bgr = self._a_bgr(pantalla)
        if isinstance(plantilla, str):
            plantilla_bgr = cv2.imread(plantilla, cv2.IMREAD_UNCHANGED)
            if plantilla_bgr is None:
                raise FileNotFoundError(f"No se pudo leer la plantilla: {plantilla}")
        else:
            plantilla_bgr = self._a_bgr(plantilla)

        th = umbral if umbral is not None else self.umbral
        if plantilla_bgr.ndim == 3 and plantilla_bgr.shape[2] == 4:
            bgr = plantilla_bgr[:, :, :3]
            alfa = plantilla_bgr[:, :, 3]
            resultado = cv2.matchTemplate(
                pantalla_bgr, bgr, cv2.TM_CCORR_NORMED, mask=alfa
            )
        else:
            resultado = cv2.matchTemplate(
                pantalla_bgr, plantilla_bgr, cv2.TM_CCOEFF_NORMED
            )

        ph, pw = plantilla_bgr.shape[:2]
        ys, xs = np.where(resultado >= th)
        if len(xs) == 0:
            return []

        # Agrupar con NMS simple de OpenCV
        cajas = np.stack([xs, ys, xs + pw, ys + ph], axis=1).astype(np.float32)
        puntuaciones = resultado[ys, xs].astype(np.float32)
        indices = cv2.dnn.NMSBoxes(
            cajas.tolist(), puntuaciones.tolist(), th, nms_u
        )

        ox, oy = offset
        objetos: list[ObjetoDetectado] = []
        for idx in indices:
            idx = int(idx)
            cx, cy = int(xs[idx]), int(ys[idx])
            objetos.append(
                ObjetoDetectado(
                    nombre=nombre,
                    x=cx + ox,
                    y=cy + oy,
                    ancho=pw,
                    alto=ph,
                    confianza=float(puntuaciones[idx]),
                )
            )
        return objetos[:maximo]

    def encontrar_botones(
        self,
        pantalla: np.ndarray,
        plantillas_botones: Optional[Sequence[np.ndarray | str]] = None,
        offset: tuple[int, int] = (0, 0),
    ) -> list[ObjetoDetectado]:
        """Busca botones conocidos por su plantilla.

        plantillas_botones: lista de plantillas (rutas o arrays numpy).
        Si se omite, no hay nada que comparar y devuelve lista vacía.
        """
        pantalla_bgr = self._a_bgr(pantalla)
        if not plantillas_botones:
            return []
        encontrados: list[ObjetoDetectado] = []
        for i, plantilla in enumerate(plantillas_botones):
            res = self.buscar_plantilla(pantalla_bgr, plantilla, offset=offset)
            if res is not None:
                encontrados.append(
                    ObjetoDetectado(
                        nombre=f"boton_{i}", x=res.x, y=res.y,
                        ancho=res.ancho, alto=res.alto,
                        confianza=res.confianza,
                    )
                )
        return encontrados


# Instancia por defecto
vision_por_defecto = Vision()
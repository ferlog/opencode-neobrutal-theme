"""Captura de pantalla usando mss (rápido, multiplataforma)."""

from __future__ import annotations

from typing import Optional

import mss
import numpy as np
from PIL import Image


class CapturaPantalla:
    """Captura la pantalla completa o una región.

    Usa mss para capturas rápidas. Devuelve imágenes PIL o arrays numpy
    (BGR, listos para OpenCV) según lo que se necesite.
    """

    def __init__(self) -> None:
        self._sct = mss.mss()

    @property
    def resolucion(self) -> dict:
        """Resolución del monitor principal: {'width': W, 'height': H}."""
        m = self._sct.monitors[0]
        return {"width": m["width"], "height": m["height"]}

    @property
    def monitores(self) -> list:
        """Lista de monitores detectados (mss)."""
        return self._sct.monitors

    def capturar_pil(
        self, region: Optional[dict] = None
    ) -> Image.Image:
        """Captura la pantalla y devuelve una imagen PIL (RGB).

        region: dict opcional con left/top/width/height.
        Si es None se captura el monitor principal completo.
        """
        region = region or self._sct.monitors[1]
        shot = self._sct.grab(region)
        return Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")

    def capturar_np(self, region: Optional[dict] = None) -> np.ndarray:
        """Captura la pantalla y devuelve un array numpy (H, W, 3) en BGR.

        Formato listo para OpenCV (cv2). Cambiar el orden de canales a RGB
        si se usa PIL después.
        """
        img = self.capturar_pil(region)
        return np.array(img)[:, :, ::-1]  # RGB -> BGR

    def capturar_rgb_np(self, region: Optional[dict] = None) -> np.ndarray:
        """Igual que capturar_np pero en orden RGB (para PIL/OCR)."""
        img = self.capturar_pil(region)
        return np.array(img)

    def capturar_region_de_pixel(self, x: int, y: int, w: int, h: int) -> dict:
        """Convierte coords de píxel en región mss."""
        return {"left": x, "top": y, "width": w, "height": h}

    def guardar(self, ruta: str, region: Optional[dict] = None) -> str:
        """Captura la pantalla y la guarda como PNG. Devuelve la ruta."""
        img = self.capturar_pil(region)
        img.save(ruta)
        return ruta

    def cerrar(self) -> None:
        self._sct.close()


# Instancia compartida para uso rápido: CapturaPantalla.grab()
captura = CapturaPantalla()
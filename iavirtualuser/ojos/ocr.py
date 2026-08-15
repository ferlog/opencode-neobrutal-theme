"""OCR con motor nativo de Windows (Windows.Media.Ocr vía winsdk).

No requiere instalar Tesseract. Devuelve el texto reconocido junto con
las coordenadas (cajas delimitadoras) de cada línea, en px de pantalla.
"""

from __future__ import annotations

import asyncio
import io
from dataclasses import dataclass
from typing import Optional

import numpy as np
from PIL import Image
from winsdk.windows.graphics.imaging import BitmapDecoder
from winsdk.windows.media.ocr import OcrEngine
from winsdk.windows.storage.streams import (DataWriter,
                                            InMemoryRandomAccessStream)


@dataclass(frozen=True)
class TextoDetectado:
    """Texto reconocido junto con su posición en pantalla (px)."""

    texto: str
    confianza: float
    x: int
    y: int
    ancho: int
    alto: int

    @property
    def centro(self) -> tuple[int, int]:
        return (self.x + self.ancho // 2, self.y + self.alto // 2)

    @property
    def caja(self) -> tuple[int, int, int, int]:
        """(x1, y1, x2, y2) estilo OpenCV."""
        return (self.x, self.y, self.x + self.ancho, self.y + self.alto)

    def __repr__(self) -> str:
        return (f"TextoDetectado({self.texto!r} @ "
                f"({self.x},{self.y} {self.ancho}x{self.alto}) "
                f"conf={self.confianza:.2f})")


class OCR:
    """Reconoce texto en imágenes usando el OCR nativo de Windows."""

    def __init__(self, idioma: Optional[str] = None) -> None:
        self._idioma = idioma
        self._engine = self._crear_motor(idioma)
        self._idioma_activo = (
            self._engine.recognizer_language.language_tag
            if self._engine else None
        )

    def _crear_motor(self, idioma: Optional[str]) -> OcrEngine:
        disponibles = list(OcrEngine.available_recognizer_languages)
        if idioma:
            for lang in disponibles:
                if lang.language_tag.lower().startswith(idioma.lower()):
                    return OcrEngine.try_create_from_language(lang)
            raise ValueError(
                f"Idioma '{idioma}' no soportado. "
                f"Disponibles: {[l.language_tag for l in disponibles]}"
            )
        try:
            return OcrEngine.try_create_from_user_profile_languages()
        except Exception:
            if not disponibles:
                raise RuntimeError("No hay motores OCR disponibles.") from None
            return OcrEngine.try_create_from_language(disponibles[0])

    @staticmethod
    def idiomas_disponibles() -> list[str]:
        return [l.language_tag
                for l in OcrEngine.available_recognizer_languages]

    def analizar(
        self,
        img: Image.Image,
        offset: tuple[int, int] = (0, 0),
    ) -> tuple[str, list[TextoDetectado]]:
        """Analiza una imagen PIL. Devuelve (texto_completo, líneas).

        offset: (x, y) que se suma a las coordenadas detectadas, útil
        cuando la imagen proviene de una región de la pantalla.
        """
        if isinstance(img, np.ndarray):
            img = Image.fromarray(img.astype(np.uint8), mode="RGB")
        elif img.mode != "RGB":
            img = img.convert("RGB")

        async def _main():
            buffer = io.BytesIO()
            img.save(buffer, format="PNG")
            data = buffer.getvalue()

            raf = InMemoryRandomAccessStream()
            writer = DataWriter(raf.get_output_stream_at(0))
            writer.write_bytes(data)
            await writer.store_async()
            raf.seek(0)

            decoder = await BitmapDecoder.create_async(raf)
            sb = await decoder.get_software_bitmap_async()
            return await self._engine.recognize_async(sb)

        resultado = asyncio.run(_main())
        if resultado is None or not resultado.text:
            return "", []

        ox, oy = offset
        lineas: list[TextoDetectado] = []
        for linea in resultado.lines:
            if not linea.words:
                continue
            x1 = y1 = 10**9
            x2 = y2 = -1
            for palabra in linea.words:
                r = palabra.bounding_rect
                x1 = min(x1, int(ox + r.x))
                y1 = min(y1, int(oy + r.y))
                x2 = max(x2, int(ox + r.x + r.width))
                y2 = max(y2, int(oy + r.y + r.height))
            lineas.append(
                TextoDetectado(
                    texto=linea.text,
                    confianza=1.0,
                    x=x1,
                    y=y1,
                    ancho=x2 - x1,
                    alto=y2 - y1,
                )
            )
        return resultado.text, lineas

    def analizar_np(self, img_np: np.ndarray,
                    offset: tuple[int, int] = (0, 0)
                    ) -> tuple[str, list[TextoDetectado]]:
        """Igual que analizar() pero acepta un array numpy (H, W, 3)."""
        if img_np.dtype != np.uint8:
            img_np = np.clip(img_np, 0, 255).astype(np.uint8)
        return self.analizar(Image.fromarray(img_np, mode="RGB"), offset)


# Instancia por defecto con el idioma del sistema
ocr_por_defecto = OCR
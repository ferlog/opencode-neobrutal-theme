"""
iavirtualuser.ojos — Percepción del escritorio.
Captura la pantalla y reconoce texto, imágenes y botones.
"""

from .captura import CapturaPantalla
from .ocr import OCR
from .vision import Vision

__all__ = ["CapturaPantalla", "OCR", "Vision"]
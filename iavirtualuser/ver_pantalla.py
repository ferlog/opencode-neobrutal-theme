"""ver_pantalla.py - Captura la pantalla y devuelve el texto visible (OCR).

Útil para que OpenCode "vea" la pantalla sin imágenes: el proceso
principal ejecuta este script y lee el texto por stdout.

Uso:
    python ver_pantalla.py                      # texto visible
    python ver_pantalla.py --detalle            # texto con coordenadas x/y
    python ver_pantalla.py --region X Y W H     # solo una región
    python ver_pantalla.py --ventana "OpenCode" # solo una ventana (por título)
    python ver_pantalla.py --secciones          # agrupa texto en cuadros/diálogos
    python ver_pantalla.py --deteccion          # igual que --secciones (alias)

El texto se imprime en UTF-8. La última línea es un marcador
"__FIN_OCR__" para facilitar el recorte del resultado.
"""

import sys
import io
from pathlib import Path

# Asegurar que la raíz del proyecto está en sys.path
RAIZ = Path(__file__).resolve().parent
if str(RAIZ) not in sys.path:
    sys.path.insert(0, str(RAIZ))

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from ojos.captura import CapturaPantalla
from ojos.ocr import OCR


def _rect_ventana(titulo: str):
    """Devuelve la región mss de la primera ventana visible cuyo título
    coincide. Usa pygetwindow (o win32gui como respaldo)."""
    try:
        import pygetwindow as gw
        wins = [w for w in gw.getWindowsWithTitle(titulo) if w.visible]
        if not wins:
            wins = gw.getWindowsWithTitle(titulo)
        if not wins:
            raise RuntimeError(f"No se encontró la ventana '{titulo}'")
        w = wins[0]
        return {"left": w.left, "top": w.top, "width": w.width, "height": w.height}
    except RuntimeError:
        raise
    except Exception:
        import ctypes
        user32 = ctypes.windll.user32
        def _enum(proc, *a):
            user32.EnumWindows(proc, 0)
        wins = []
        def _cb(hwnd, _):
            if user32.IsWindowVisible(hwnd):
                length = user32.GetWindowTextLengthW(hwnd)
                buf = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buf, length + 1)
                if titulo.lower() in buf.value.lower():
                    r = ctypes.wintypes.RECT()
                    user32.GetWindowRect(hwnd, ctypes.byref(r))
                    wins.append((r.left, r.top, r.right - r.left, r.bottom - r.top))
            return True
        user32.EnumWindows(ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_int,
                                              ctypes.c_int)(_cb), 0)
        if not wins:
            raise RuntimeError(f"No se encontró la ventana '{titulo}'")
        l, t, w, h = wins[0]
        return {"left": l, "top": t, "width": w, "height": h}


def _detectar_cuadros(img, lineas):
    """Agrupa las líneas OCR en 'secciones' (cuadros / diálogos / paneles).

    Detecta rectángulos con borde mediante OpenCV (Canny + contornos) y
    asigna cada línea de texto a la sección más pequeña que la contiene.
    Devuelve una lista de dicts: {x, y, w, h, lineas: [TextoDetectado]}.
    """
    try:
        import cv2
        import numpy as np
    except Exception:
        # Sin OpenCV: agrupar por proximidad vertical (heurística simple)
        return _agrupar_por_proximidad(lineas)

    gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    # Dilatar para cerrar líneas del borde
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=2)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    cajas = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        # Solo rectángulos con área razonable (sección/pánel, no ruido)
        if w < 40 or h < 25:
            continue
        area = w * h
        if area < 400:
            continue
        # El contorno debe ser aproximadamente rectangular y cerrado
        approx = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True)
        if len(approx) not in (4, 5):
            continue
        cajas.append((x, y, w, h))

    if not cajas:
        return _agrupar_por_proximidad(lineas)

    # Asignar cada línea a la caja más pequeña que la contenga
    secciones = []
    usadas = set()
    for (x, y, w, h) in cajas:
        dentro = []
        for i, t in enumerate(lineas):
            cx, cy = t.x + t.ancho // 2, t.y + t.alto // 2
            if x <= cx <= x + w and y <= cy <= y + h:
                dentro.append(i)
                usadas.add(i)
        if dentro:
            secciones.append({"x": x, "y": y, "w": w, "h": h,
                              "lineas": [lineas[i] for i in dentro]})

    # Líneas que no quedaron en ninguna caja → sección "fondo"
    sueltas = [lineas[i] for i in range(len(lineas)) if i not in usadas]
    secciones = sorted(secciones, key=lambda s: (s["y"], s["x"]))
    return secciones, sueltas


def _agrupar_por_proximidad(lineas):
    """Heurística: agrupa líneas cuyas cajas se tocan/traslapan en bloques."""
    lineas = sorted(lineas, key=lambda t: (t.y, t.x))
    grupos = []
    for t in lineas:
        colocado = False
        for g in grupos:
            gx1, gy1, gx2, gy2 = g["bbox"]
            tx1, ty1, tx2, ty2 = t.x, t.y, t.x + t.ancho, t.y + t.alto
            # ¿Se traslapan horizontalmente o están muy cerca?
            if (tx1 < gx2 + 30 and tx2 > gx1 - 30 and
                    ty1 < gy2 + 40 and ty2 > gy1 - 40):
                g["lineas"].append(t)
                g["bbox"] = (min(gx1, tx1), min(gy1, ty1),
                             max(gx2, tx2), max(gy2, ty2))
                colocado = True
                break
        if not colocado:
            grupos.append({"bbox": (t.x, t.y, t.x + t.ancho, t.y + t.alto),
                           "lineas": [t]})
    return [{"x": g["bbox"][0], "y": g["bbox"][1],
             "w": g["bbox"][2] - g["bbox"][0], "h": g["bbox"][3] - g["bbox"][1],
             "lineas": sorted(g["lineas"], key=lambda t: (t.y, t.x))}
            for g in grupos], []


def main() -> None:
    detalle = "--detalle" in sys.argv
    secciones = ("--secciones" in sys.argv or "--deteccion" in sys.argv)

    region = None
    if "--region" in sys.argv:
        i = sys.argv.index("--region")
        try:
            x, y, w, h = map(int, sys.argv[i + 1 : i + 5])
            region = {"left": x, "top": y, "width": w, "height": h}
        except Exception:
            print("region inválida (usa --region X Y W H)")
            print("__FIN_OCR__")
            return
    elif "--ventana" in sys.argv:
        i = sys.argv.index("--ventana")
        titulo = sys.argv[i + 1]
        try:
            region = _rect_ventana(titulo)
        except RuntimeError as e:
            print(f"ERROR: {e}")
            print("__FIN_OCR__")
            return

    capt = CapturaPantalla()
    img = capt.capturar_pil(region)

    ocr = OCR()
    _texto, lineas = ocr.analizar(img)

    if secciones:
        secciones_det, sueltas = _detectar_cuadros(img, lineas)
        for i, sec in enumerate(secciones_det, 1):
            ls = sorted(sec["lineas"], key=lambda t: (t.y, t.x))
            if detalle:
                print(f"=== SECCIÓN {i} @ ({sec['x']},{sec['y']} "
                      f"{sec['w']}x{sec['h']}) ===")
            else:
                print(f"=== SECCIÓN {i} ===")
            for t in ls:
                txt = t.texto.strip()
                if not txt:
                    continue
                if detalle:
                    print(f"  {txt}\t{t.x}\t{t.y}\t{t.ancho}\t{t.alto}")
                else:
                    print(f"  {txt}")
        if sueltas:
            print("=== (sin sección definida) ===")
            for t in sorted(sueltas, key=lambda t: (t.y, t.x)):
                txt = t.texto.strip()
                if not txt:
                    continue
                if detalle:
                    print(f"  {txt}\t{t.x}\t{t.y}\t{t.ancho}\t{t.alto}")
                else:
                    print(f"  {txt}")
    else:
        lineas_ordenadas = sorted(lineas, key=lambda t: (t.y, t.x))
        if detalle:
            for t in lineas_ordenadas:
                print(f"{t.texto}\t{t.x}\t{t.y}\t{t.ancho}\t{t.alto}")
        else:
            for t in lineas_ordenadas:
                txt = t.texto.strip()
                if txt:
                    print(txt)

    print("__FIN_OCR__")


if __name__ == "__main__":
    main()

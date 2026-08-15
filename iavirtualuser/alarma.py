"""alarma.py - Reproduce una alarma/sonido corto al terminar una respuesta.

Usa winsound.Beep (tono puro de Windows), que funciona siempre y no depende
de archivos de audio. Útil como notificación auditiva breve ("la respuesta
terminó"), distinta de la lectura en voz alta (leer_texto.py).

Uso:
    python alarma.py            # beep simple
    python alarma.py doble      # dos tonos (alarma más notoria)

No imprime nada en stdout salvo el marcador "__FIN_ALARMA__".
"""

import sys
import winsound

DURACION = 120  # ms por tono


def main() -> None:
    doble = len(sys.argv) > 1 and sys.argv[1].lower() in ("doble", "2", "on")
    try:
        if doble:
            winsound.Beep(880, DURACION)
            winsound.Beep(1320, DURACION)
        else:
            winsound.Beep(880, DURACION)
        print("OK")
    except Exception as e:
        print("ERROR: " + str(e))
    print("__FIN_ALARMA__")


if __name__ == "__main__":
    main()

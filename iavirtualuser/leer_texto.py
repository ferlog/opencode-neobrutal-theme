"""leer_texto.py - Lee un texto en voz alta usando TTS nativo de Windows.

Usa winsdk (Windows.Media.SpeechSynthesis) para sintetizar el texto a audio
y lo reproduce con winsound. Funciona de forma fiable en Electron (a
diferencia de window.speechSynthesis).

Uso:
    python leer_texto.py "el texto a leer"

El script no imprime nada en stdout salvo un marcador "__FIN_TTS__" al
terminar, para facilitar el recorte del resultado por el proceso principal.
"""

import asyncio
import io
import sys
import tempfile
import os
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
if str(RAIZ) not in sys.path:
    sys.path.insert(0, str(RAIZ))

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from winsdk.windows.media.speechsynthesis import SpeechSynthesizer
from winsdk.windows.storage.streams import (
    DataReader, InputStreamOptions
)


def _synth(texto: str, ruta_wav: str) -> None:
    async def _main():
        synth = SpeechSynthesizer()
        stream = await synth.synthesize_text_to_stream_async(texto)

        # Leer el stream completo
        reader = DataReader(stream.get_input_stream_at(0))
        size = stream.size
        reader.input_stream_options = InputStreamOptions.READ_AHEAD
        await reader.load_async(int(size))
        buffer = bytearray(size)
        reader.read_bytes(buffer)
        data = bytes(buffer)

        with open(ruta_wav, "wb") as f:
            f.write(data)

    asyncio.run(_main())


def main() -> None:
    if len(sys.argv) < 2 or not sys.argv[1].strip():
        print("Falta el texto a leer. Uso: leer_texto.py \"texto\"")
        print("__FIN_TTS__")
        return

    texto = sys.argv[1]
    tmp = os.path.join(tempfile.gettempdir(), "opencode", "tts")
    os.makedirs(tmp, exist_ok=True)
    wav = os.path.join(tmp, "tts_last.wav")

    try:
        _synth(texto, wav)
        import winsound
        # Sin SND_ASYNC: la reproducción es síncrona (bloqueante), el proceso
        # espera a que el audio termine. Con SND_ASYNC el proceso Python sale
        # al instante y corta el sonido antes de reproducirse.
        winsound.PlaySound(wav, winsound.SND_FILENAME)
        print("OK")
    except Exception as e:
        print("ERROR: " + str(e))

    print("__FIN_TTS__")


if __name__ == "__main__":
    main()

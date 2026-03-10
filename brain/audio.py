import os
import tempfile
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def transcribir_audio(audio_bytes: bytes, extension: str = "ogg") -> str:
    with tempfile.NamedTemporaryFile(suffix=f".{extension}", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as audio_file:
            transcripcion = client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=(f"audio.{extension}", audio_file),
                language="es"
            )
        return transcripcion.text
    finally:
        os.unlink(tmp_path)
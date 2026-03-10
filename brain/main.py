from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from agent import responder_texto
import os

load_dotenv()

app = FastAPI(title="Malamute AI Brain", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

NEGOCIO = "Tienda de Ropa Urbana"
PERSONALIDAD = """Eres Pipe, el parcero de la tienda. Hablas relajado y con jerga colombiana.
Eres buena gente, conoces de moda urbana y siempre buscas cerrar la venta de forma natural."""
CATALOGO = """
- Air Force One blancas: $280.000 COP
- Air Force One negras: $280.000 COP
- Nike Dunk Low pandas: $320.000 COP
- Camiseta oversize negra: $85.000 COP
- Camiseta oversize blanca: $85.000 COP
- Jogger cargo gris: $120.000 COP
"""

@app.get("/")
def root():
    return {"status": "🐺 Malamute AI activo", "version": "1.0.0"}

@app.post("/chat")
async def chat(
    mensaje: str = Form(...),
    historial: str = Form(default="[]")
):
    import json
    hist = json.loads(historial)
    respuesta = responder_texto(mensaje, hist, NEGOCIO, PERSONALIDAD, CATALOGO)
    return {"respuesta": respuesta}

@app.post("/audio")
async def procesar_audio(
    audio: UploadFile = File(...),
    historial: str = Form(default="[]")
):
    import json
    from audio import transcribir_audio
    
    audio_bytes = await audio.read()
    extension = audio.filename.split(".")[-1] if audio.filename else "ogg"
    
    texto = transcribir_audio(audio_bytes, extension)
    
    hist = json.loads(historial)
    respuesta = responder_texto(texto, hist, NEGOCIO, PERSONALIDAD, CATALOGO)
    
    return {
        "transcripcion": texto,
        "respuesta": respuesta
    }

@app.post("/imagen")
async def procesar_imagen(
    imagen: UploadFile = File(...),
    pregunta: str = Form(default=""),
    historial: str = Form(default="[]")
):
    from vision import analizar_imagen
    
    imagen_bytes = await imagen.read()
    respuesta = analizar_imagen(imagen_bytes, CATALOGO, pregunta)
    
    return {
        "respuesta": respuesta
    }

import os
import base64
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def analizar_imagen(imagen_bytes: bytes, catalogo: str, pregunta: str = "") -> str:
    imagen_base64 = base64.b64encode(imagen_bytes).decode("utf-8")
    
    prompt = f"""Eres un experto analizando productos para una tienda.

Este es el catálogo disponible:
{catalogo}

Analiza la imagen y:
1. Describe qué producto ves
2. Busca si hay algo similar en el catálogo
3. Si hay match, da el precio exacto
4. Si no hay, dilo honestamente y sugiere lo más parecido

{f'El cliente pregunta: {pregunta}' if pregunta else ''}

Responde como un vendedor colombiano relajado y natural."""

    respuesta = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{imagen_base64}"
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ],
        max_tokens=500
    )
    
    return respuesta.choices[0].message.content
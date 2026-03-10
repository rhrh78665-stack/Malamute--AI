import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def get_system_prompt(nombre_negocio: str, personalidad: str, catalogo: str) -> str:
    return f"""Eres el asistente virtual de {nombre_negocio}.

{personalidad}

Este es tu catálogo de productos y servicios:
{catalogo}

Reglas importantes:
- Responde SIEMPRE en el tono y estilo que se te indicó
- Si preguntan por un producto, búscalo en tu catálogo y da precio exacto
- Si no tienes el producto, dilo honestamente y sugiere algo similar
- Nunca inventes precios ni productos que no estén en el catálogo
- Mantén las respuestas cortas y naturales como un chat de WhatsApp
- Si cierras una venta, pide los datos de entrega
"""

def responder_texto(mensaje: str, historial: list, nombre_negocio: str, personalidad: str, catalogo: str) -> str:
    messages = [
        {"role": "system", "content": get_system_prompt(nombre_negocio, personalidad, catalogo)}
    ] + historial + [
        {"role": "user", "content": mensaje}
    ]

    respuesta = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=500,
        temperature=0.7
    )

    return respuesta.choices[0].message.content
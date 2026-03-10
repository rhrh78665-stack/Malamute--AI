FROM node:20-slim

RUN apt-get update && apt-get install -y python3 python3-pip python3-venv

WORKDIR /app

COPY . .

RUN python3 -m venv /venv
RUN /venv/bin/pip install fastapi uvicorn groq python-dotenv aiofiles python-multipart

RUN cd bot-whatsapp && npm install

EXPOSE 8000

CMD ["/venv/bin/uvicorn", "brain.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "brain"]
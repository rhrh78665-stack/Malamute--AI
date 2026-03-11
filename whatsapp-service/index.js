const baileys = require('@whiskeysockets/baileys')
const makeWASocket = baileys.default
const { useMultiFileAuthState, DisconnectReason } = baileys
const pino = require('pino')
const axios = require('axios')
const express = require('express')
const qrcode = require('qrcode')

const app = express()
const BRAIN_URL = process.env.BRAIN_URL || 'https://malamute-ai-production.up.railway.app'

let qrImageUrl = null
let connected = false

app.get('/', (req, res) => {
    if (connected) {
        res.send('<h1>Malamute AI conectado a WhatsApp</h1>')
    } else if (qrImageUrl) {
        res.send(`<h1>Escanea este QR con WhatsApp</h1><img src="${qrImageUrl}" style="width:300px"/>`)
    } else {
        res.send('<h1>Iniciando Malamute AI...</h1><meta http-equiv="refresh" content="3">')
    }
})

async function conectarWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('/tmp/auth_info')

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            console.log('QR generado')
            qrImageUrl = await qrcode.toDataURL(qr)
            connected = false
        }
        if (connection === 'open') {
            console.log('Malamute AI conectado')
            connected = true
            qrImageUrl = null
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) conectarWhatsApp()
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return

        const from = msg.key.remoteJid
        const tipo = Object.keys(msg.message)[0]

        try {
            let respuesta = ''

            if (tipo === 'conversation' || tipo === 'extendedTextMessage') {
                const texto = msg.message.conversation || msg.message.extendedTextMessage?.text
                const res = await axios.post(`${BRAIN_URL}/chat`,
                    new URLSearchParams({ mensaje: texto, historial: '[]' }),
                    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                )
                respuesta = res.data.respuesta

            } else if (tipo === 'audioMessage') {
                const buffer = await sock.downloadMediaMessage(msg)
                const FormData = require('form-data')
                const form = new FormData()
                form.append('audio', buffer, { filename: 'audio.ogg', contentType: 'audio/ogg' })
                form.append('historial', '[]')
                const res = await axios.post(`${BRAIN_URL}/audio`, form, { headers: form.getHeaders() })
                respuesta = res.data.respuesta

            } else if (tipo === 'imageMessage') {
                const buffer = await sock.downloadMediaMessage(msg)
                const caption = msg.message.imageMessage?.caption || ''
                const FormData = require('form-data')
                const form = new FormData()
                form.append('imagen', buffer, { filename: 'imagen.jpg', contentType: 'image/jpeg' })
                form.append('pregunta', caption)
                form.append('historial', '[]')
                const res = await axios.post(`${BRAIN_URL}/imagen`, form, { headers: form.getHeaders() })
                respuesta = res.data.respuesta
            }

            if (respuesta) {
                await sock.sendMessage(from, { text: respuesta })
            }

        } catch (error) {
            console.error('Error:', error.message)
        }
    })
}

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Malamute AI corriendo en puerto ${PORT}`))
conectarWhatsApp()
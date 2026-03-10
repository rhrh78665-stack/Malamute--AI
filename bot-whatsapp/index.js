const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require('baileys')
const qrcode = require('qrcode-terminal')
const axios = require('axios')
const pino = require('pino')

const BRAIN_URL = 'http://127.0.0.1:8000'

async function conectarWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            console.log('\nMALAMUTE AI - Escanea este QR:\n')
            qrcode.generate(qr, { small: true })
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) conectarWhatsApp()
        }
        if (connection === 'open') {
            console.log('Malamute AI conectado a WhatsApp')
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

conectarWhatsApp()
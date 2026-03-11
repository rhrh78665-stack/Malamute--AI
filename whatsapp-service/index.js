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
let whatsappStarted = false

app.get('/', (req, res) => {
    if (!whatsappStarted) {
        res.send('<h1>Malamute AI iniciando...</h1>')
        return
    }

    if (connected) {
        res.send('<h1>Malamute AI conectado a WhatsApp</h1>')
        return
    }

    if (qrImageUrl) {
        res.send(`<h1>Escanea este QR con WhatsApp</h1><img src="${qrImageUrl}" width="300"/>`)
        return
    }

    res.send('<h1>Esperando QR...</h1>')
})

async function conectarWhatsApp() {

    const { state, saveCreds } = await useMultiFileAuthState('/tmp/auth')

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {

        if (qr) {
            qrImageUrl = await qrcode.toDataURL(qr)
            connected = false
        }

        if (connection === 'open') {
            connected = true
            qrImageUrl = null
        }

        if (connection === 'close') {

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

            if (shouldReconnect) {
                conectarWhatsApp()
            }
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

                const texto =
                    msg.message.conversation ||
                    msg.message.extendedTextMessage?.text

                const res = await axios.post(
                    `${BRAIN_URL}/chat`,
                    new URLSearchParams({
                        mensaje: texto,
                        historial: '[]'
                    }),
                    {
                        headers: {
                            'Content-Type':
                                'application/x-www-form-urlencoded'
                        }
                    }
                )

                respuesta = res.data.respuesta

            }

            if (respuesta) {
                await sock.sendMessage(from, { text: respuesta })
            }

        } catch (e) {
            console.error(e.message)
        }

    })

}

const PORT = process.env.PORT || 8080

app.listen(PORT, () => {

    console.log(`Malamute AI corriendo en puerto ${PORT}`)

    setTimeout(() => {

        whatsappStarted = true

        conectarWhatsApp()

    }, 5000)

})
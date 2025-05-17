import makeWASocket, { fetchLatestBaileysVersion, makeCacheableSignalKeyStore, useMultiFileAuthState } from "baileys";
import logger from "baileys/lib/Utils/logger";

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info')
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.log(`\n >>> using WA v${version.join('.')}, isLatest: ${isLatest}\n`)

    const sock = makeWASocket({
        version,
        logger,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
    });

    sock.ev.on('creds.update', async () => {
        await saveCreds();
    });

    sock.ev.on('connection.update', ({ connection }) => {
        if (connection === 'open') console.log('✅ Conectado!')
    });

    sock.ev.on('messages.upsert', async ({ messages, type, requestId }) => {
        console.log(JSON.stringify({ messages, type, requestId }))
    });
}

iniciarBot()


import makeWASocket, { fetchLatestBaileysVersion, makeCacheableSignalKeyStore, useMultiFileAuthState } from "baileys";
import logger from "baileys/lib/Utils/logger";
import { BEvents } from "../enums";

export class WhatsappBot {
    private sock: ReturnType<typeof makeWASocket> | null = null;

    async iniciar() {
        const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
        const { version, isLatest } = await fetchLatestBaileysVersion();

        console.log(`\n >>> using WA v${version.join('.')}, isLatest: ${isLatest}\n`);

        this.sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
        });

        this.sock.ev.on(BEvents.CREDS_UPDATE, async () => {
            await saveCreds();
        });

        this.sock.ev.on(BEvents.CONNECTION_UPDATE, ({ connection }) => {
            if (connection === 'open') console.log('✅ Conectado!');
        });

        this.sock.ev.on(BEvents.MESSAGES_UPSERT, async ({ messages, type, requestId }) => {
            console.log(JSON.stringify({ messages, type, requestId }));
        });
    }
}

// const bot = new WhatsappBot();
// bot.iniciar();


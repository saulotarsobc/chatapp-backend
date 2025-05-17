import NodeCache from '@cacheable/node-cache';
import makeWASocket, {
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    proto,
    useMultiFileAuthState,
    WAMessageContent,
    WAMessageKey
} from 'baileys';
import P from 'pino';
import QRCode, { QRCodeToDataURLOptions } from 'qrcode';
import readline from 'readline';

const optsQrcode: QRCodeToDataURLOptions = {
    margin: 3,
    scale: 4,
    errorCorrectionLevel: 'H',
    color: { light: '#ffffff', dark: "#7498167" },
};

export class WhatsAppBot {
    private logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./wa-logs.txt'))
    private msgRetryCounterCache = new NodeCache()
    private rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    private lastQrcode: string = '';

    constructor() {
        this.logger.level = 'trace';
    }

    private async getMessage(key: WAMessageKey): Promise<WAMessageContent | undefined> {
        return proto.Message.fromObject({});
    }

    public async start() {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

        const sock = makeWASocket({
            version,
            logger: this.logger,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, this.logger),
            },
            msgRetryCounterCache: this.msgRetryCounterCache,
            generateHighQualityLinkPreview: true,
            getMessage: this.getMessage,
        });

        sock.ev.on('connection.update', async ({ qr }) => {
            if (qr) {
                const qrcode = await QRCode.toDataURL(qr, optsQrcode);;
                this.lastQrcode = qrcode;
                console.log(await QRCode.toString(qr))
            }
        });

        sock.ev.on("creds.update", async () => { await saveCreds() });

        return sock;
    }

    public async connect() {
        return {
            qrcode: this.lastQrcode,
        }
    }

    public getStatus() {
        return 'connected'
    }
}

export const bot = new WhatsAppBot();
bot.start();

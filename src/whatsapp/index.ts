import NodeCache from '@cacheable/node-cache';
import makeWASocket, {
    Contact,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    proto,
    useMultiFileAuthState,
    WAMessageContent,
    WAMessageKey
} from 'baileys';
import P from 'pino';
import QRCode from 'qrcode';
import { codeOptions } from '../contants';

export class WhatsAppBot {
    private logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./wa-logs.txt'))
    private msgRetryCounterCache = new NodeCache()
    private lastQrcode: string = '';
    private sock?: ReturnType<typeof makeWASocket>;
    private me?: Contact;
    private isOnline = false;

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

        this.sock = makeWASocket({
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

        /* Events */
        this.sock.ev.on('connection.update', async ({ qr, connection, isOnline }) => {
            if (qr) {
                this.lastQrcode = await QRCode.toDataURL(qr, codeOptions)

                // QR visual no terminal
                console.log(await QRCode.toString(qr, { type: 'terminal' }))

                // Base64 no terminal
                console.log('\n🖼️ QR Code em base64 (DataURL):')
                console.log(this.lastQrcode)
            }

            if (connection == 'close') {
                console.log('❌ Connection closed');
            }

            if (connection == 'open') {
                console.log('✅ Connection opened');
            }

            if (connection == 'connecting') {
                console.log('🔄 Connecting...');
            }

            this.isOnline = isOnline || false;
        });

        this.sock.ev.on("creds.update", async ({ me }) => { await saveCreds() });
    }


    public async connect() {
        return {
            qrcode: this.lastQrcode,
        }
    }

    public getStatus() {
        return {
            isOnline: this.isOnline,
            me: this.me,
        };
    }
}

export const bot = new WhatsAppBot();
bot.start();

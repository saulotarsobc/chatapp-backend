import makeWASocket, {
    Contact,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    proto,
    useMultiFileAuthState,
    WASocket
} from "baileys";
import qrcode from 'qrcode-terminal';

export class WhatsappBot {
    private sock: WASocket | null = null;
    private qrCode: string | null = null;
    private isConnected = false;
    private me?: Contact;
    private account?: proto.IADVSignedDeviceIdentity;
    private registered?: boolean;

    async start() {
        const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
        const { version } = await fetchLatestBaileysVersion();

        this.sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys),
            },
        });

        this.sock.ev.on('creds.update', ({ me, account, registered }) => {
            saveCreds();
            this.me = me || undefined;
            this.account = account || undefined;
            this.registered = registered;
        });

        this.sock.ev.on('connection.update', ({ connection, qr, lastDisconnect }) => {
            if (qr) {
                this.qrCode = qr;
                console.log('QR Code:', qr);
                qrcode.generate(qr, { small: true });
            };

            if (connection === 'open') {
                console.log('✅ Conectado!');
                this.isConnected = true;
            }

            if (connection === 'close') {
                const reason = lastDisconnect?.error?.message || 'Desconhecido';
                console.log(`❌ Conexão fechada. Motivo: ${reason}`);
                this.isConnected = false;
            }
        });
    }

    async connect(): Promise<{ qr?: string | null }> {
        if (this.isConnected) {
            return { qr: this.qrCode };
        }

        if (!this.isConnected && this.qrCode) {
            return { qr: this.qrCode };
        }

        await this.start();
        return { qr: this.qrCode };
    }

    getStatus(): any {
        return {
            isConnected: this.isConnected,
            me: this.me,
            account: this.account,
        };
    }
}

export const bot = new WhatsappBot();

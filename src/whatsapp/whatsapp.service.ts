// src/whatsapp/whatsapp.service.ts
import { Injectable, Logger } from '@nestjs/common';
import makeWASocket, {
  AuthenticationCreds,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Função auxiliar para serializar o objeto de estado,
   * removendo funções e convertendo Buffers para strings (base64).
   */
  private serializeState(state: any): any {
    return JSON.parse(
      JSON.stringify(state, (_key, value) => {
        if (typeof value === 'function') return undefined;
        if (
          value &&
          typeof value === 'object' &&
          value.type === 'Buffer' &&
          Array.isArray(value.data)
        ) {
          return Buffer.from(value.data).toString('base64');
        }
        return value;
      }),
    );
  }

  /**
   * Cria uma nova sessão do WhatsApp.
   * O QR code será exibido no terminal.
   */
  async createSession({ sessionName }: CreateSessionDto) {
    const authFolder = `./sessions/${sessionName}`;
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true, // Mostra o QR code no terminal
    });

    // Atualiza as credenciais sempre que houver mudanças
    sock.ev.on('creds.update', async (creds: AuthenticationCreds) => {
      this.logger.debug(`Credenciais atualizadas para a sessão ${sessionName}`);
      const serializableCreds = this.serializeState(creds);
      try {
        await this.prisma.whatsappSession.update({
          where: { sessionName },
          data: { sessionData: serializableCreds },
        });
      } catch (error) {
        this.logger.error(
          `Erro ao atualizar credenciais para ${sessionName}: ${error.message}`,
        );
      }
    });

    const serializableState = this.serializeState(state);

    try {
      await this.prisma.whatsappSession.create({
        data: {
          sessionName,
          sessionData: serializableState,
        },
      });
    } catch (error) {
      this.logger.error(
        `Erro ao criar sessão ${sessionName}: ${error.message}`,
      );
      throw error;
    }

    return { socket: sock, sessionName };
  }

  /**
   * Rehidrata uma sessão existente a partir dos dados persistidos.
   */
  async rehydrateSession(sessionName: string) {
    console.log('Reidratando sessão', sessionName);
    const session = await this.prisma.whatsappSession.findUnique({
      where: { sessionName },
    });

    if (!session) {
      throw new Error(`Sessão ${sessionName} não encontrada`);
    }

    const authFolder = `./sessions/${sessionName}`;
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
    });

    sock.ev.on('creds.update', async (creds: AuthenticationCreds) => {
      this.logger.debug(`Credenciais atualizadas para a sessão ${sessionName}`);
      const serializableCreds = this.serializeState(creds);
      try {
        await this.prisma.whatsappSession.update({
          where: { sessionName },
          data: { sessionData: serializableCreds },
        });
      } catch (error) {
        this.logger.error(
          `Erro ao atualizar credenciais para ${sessionName}: ${error.message}`,
        );
      }
    });

    console.log({ sock });
    return { sessionName, state, saveCreds, version };
  }

  /**
   * Obtém o QR code da sessão.
   *
   * Se a sessão não existir, ela será criada.
   * Em seguida, aguarda o evento 'connection.update' que contenha a propriedade "qr".
   */
  async getQrCode(sessionName: string): Promise<string> {
    let socketObj;
    try {
      // Tenta recarregar a sessão
      socketObj = await this.rehydrateSession(sessionName);
    } catch (error) {
      // Se não existir, cria uma nova sessão
      socketObj = await this.createSession({ sessionName });
    }
    const { socket } = socketObj;

    return new Promise<string>((resolve, reject) => {
      const handler = (update: any) => {
        if (update.qr) {
          // Remove o listener para evitar chamadas múltiplas
          socket.ev.off('connection.update', handler);
          clearTimeout(timer);
          resolve(update.qr);
        }
      };

      const timer = setTimeout(() => {
        socket.ev.off('connection.update', handler);
        reject(new Error('Timeout ao aguardar o QR code'));
      }, 15000); // Timeout de 15 segundos

      socket.ev.on('connection.update', handler);
    });
  }
}

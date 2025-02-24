// src/whatsapp/whatsapp.controller.ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateSessionDto } from './dto';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('session')
  async createSession(@Body() data: CreateSessionDto) {
    const session = await this.whatsappService.createSession(data);
    return {
      message: 'Sessão criada com sucesso!',
      sessionName: session.sessionName,
    };
  }

  @Get('session/:sessionName')
  async rehydrateSession(@Param('sessionName') sessionName: string) {
    return await this.whatsappService.rehydrateSession(sessionName);
  }

  @Get('session/qrcode/:sessionName')
  async getQrCode(@Param('sessionName') sessionName: string) {
    try {
      const qr = await this.whatsappService.getQrCode(sessionName);
      return { message: 'QR Code gerado com sucesso!', qr };
    } catch (error) {
      return { message: 'Erro ao obter o QR Code', error: error.message };
    }
  }
}

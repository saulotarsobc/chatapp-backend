import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [PrismaModule],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [],
})
export class WhatsappModule {}

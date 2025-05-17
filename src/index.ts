import express from 'express';
import { WhatsappBot } from './whatsapp';

const bot = new WhatsappBot();
bot.iniciar();


const bootstrap = async () => {
    const app = express();

    app.listen(3000, () => {
        console.log('Server is running on port 3000');
    });
}

bootstrap();

import express from 'express';
import { InstancesController } from './instances/instances.controller';
import { bot } from './whatsapp';

const app = express();
app.use(express.json());

// Routes
app.use('/instances', InstancesController);

const bootstrap = async () => {
    await bot.start();

    app.listen(3000, () => {
        console.log('Server is running on port 3000');
    });
}

bootstrap();

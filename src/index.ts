import express from 'express';
import pino from 'pino';
import { InstancesController } from './instances/instances.controller';
import startSock from './whatsapp';

const app = express();
app.use(express.json());

// Routes
app.use('/instances', InstancesController);

const logger = pino();

const bootstrap = async () => {
    await startSock();

    logger.info('Servidor iniciado com sucesso');

    app.listen(3000, () => {
        logger.info('Server is running on port 3000');
    });
}

bootstrap();

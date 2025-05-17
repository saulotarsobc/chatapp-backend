import express, { Request, Response } from 'express';
import { bot } from '../whatsapp';

export const InstancesController = express.Router();

InstancesController.post('/connect', async (_req: Request, res: Response): Promise<any> => {
    const data = await bot.connect();
    return res.status(200).json(data);
});

InstancesController.get('/status', async (_req: Request, res: Response): Promise<any> => {
    const status = bot.getStatus();
    return res.status(200).json({ status });
});

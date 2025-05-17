import express from 'express';
import { InstancesController } from './instances/instances.controller';

const app = express();
app.use(express.json());

// Routes
app.use('/instances', InstancesController);

const bootstrap = async () => {
    app.listen(3000, () => {
        console.log('Server is running on port 3000');
    });
}

bootstrap();

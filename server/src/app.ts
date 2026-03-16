import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import reconcileRouter from './routes/reconcile';
import validateRouter from './routes/validate';

const app = express();

const allowedOrigin = process.env.CLIENT_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', authMiddleware);
app.use('/api/reconcile', reconcileRouter);
app.use('/api/validate', validateRouter);

export default app;

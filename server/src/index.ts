import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { authMiddleware } from './middleware/auth';
import reconcileRouter from './routes/reconcile';
import validateRouter from './routes/validate';

// Load env from repo root so server sees shared .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth protects everything under /api
app.use('/api', authMiddleware);
app.use('/api/reconcile', reconcileRouter);
app.use('/api/validate', validateRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes (you'll add these next)
// app.use('/api/reconcile', reconcileRouter);
// app.use('/api/validate', validateRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
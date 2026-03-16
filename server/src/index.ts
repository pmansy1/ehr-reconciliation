import path from 'path';
import dotenv from 'dotenv';
import app from './app';

// Load env from repo root for local development
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
    res.status(401).json({ error: 'Unauthorized: invalid or missing API key' });
    return;
  }

  next();
};
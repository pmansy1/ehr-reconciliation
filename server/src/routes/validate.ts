import { Router, Request, Response } from 'express';
import { DataQualityRequestSchema } from '../schemas';
import { validateDataQualityWithClaude } from '../services/claudeService';

const router = Router();

router.post('/data-quality', async (req: Request, res: Response): Promise<void> => {
  const result = DataQualityRequestSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: 'Invalid request', details: result.error.flatten() });
    return;
  }

  try {
    const aiResponse = await validateDataQualityWithClaude(result.data);
    res.json(aiResponse);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error during data quality validation';
    res.status(500).json({
      error: 'Failed to validate data quality',
      details: message,
    });
  }
});

export default router;
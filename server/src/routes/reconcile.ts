import { Router, Request, Response } from 'express';
import { ReconcileRequestSchema } from '../schemas';
import { reconcileMedicationWithClaude } from '../services/claudeService';

const router = Router();

router.post('/medication', async (req: Request, res: Response): Promise<void> => {
  const result = ReconcileRequestSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: 'Invalid request', details: result.error.flatten() });
    return;
  }

  try {
    const aiResponse = await reconcileMedicationWithClaude(result.data);
    res.json(aiResponse);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error during medication reconciliation';
    res.status(500).json({
      error: 'Failed to reconcile medication records',
      details: message,
    });
  }
});

export default router;
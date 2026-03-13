import { Router, Request, Response } from 'express';
import { DataQualityRequestSchema } from '../schemas';

const router = Router();

router.post('/data-quality', (req: Request, res: Response): void => {
  const result = DataQualityRequestSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: 'Invalid request', details: result.error.flatten() });
    return;
  }

  // Hardcoded mock response matching assessment spec
  res.json({
    overall_score: 62,
    breakdown: {
      completeness: 60,
      accuracy: 50,
      timeliness: 70,
      clinical_plausibility: 40,
    },
    issues_detected: [
      {
        field: 'allergies',
        issue: 'No allergies documented - likely incomplete',
        severity: 'medium',
      },
      {
        field: 'vital_signs.blood_pressure',
        issue: 'Blood pressure 340/180 is physiologically implausible',
        severity: 'high',
      },
    ],
  });
});

export default router;
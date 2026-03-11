import { z } from 'zod';

export const MedicationSourceSchema = z.object({
  system: z.string(),
  medication: z.string(),
  source_reliability: z.enum(['high', 'medium', 'low']),
  last_updated: z.string().optional(),
  last_filled: z.string().optional(),
});

export const ReconcileRequestSchema = z.object({
  patient_context: z.object({
    age: z.number(),
    conditions: z.array(z.string()),
    recent_labs: z.record(z.string(), z.number()).optional(),
  }),
  sources: z.array(MedicationSourceSchema).min(2),
});

export const DataQualityRequestSchema = z.object({
  demographics: z.object({
    name: z.string().optional(),
    dob: z.string().optional(),
    gender: z.string().optional(),
  }),
  medications: z.array(z.string()),
  allergies: z.array(z.string()),
  conditions: z.array(z.string()),
  vital_signs: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  last_updated: z.string().optional(),
});

export type ReconcileRequest = z.infer<typeof ReconcileRequestSchema>;
export type DataQualityRequest = z.infer<typeof DataQualityRequestSchema>;
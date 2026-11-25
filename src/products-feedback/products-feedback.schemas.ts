import { z } from 'zod';
export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
});
export const createFeedbackSchema = z.object({
  text: z.string().trim().min(3).max(10000),
  source: z.string().trim().max(80).optional(),
  segment: z.string().trim().max(120).optional(),
  theme: z.string().trim().max(120).optional(),
  sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  owner: z.string().trim().max(160).optional(),
  dueAt: z.string().datetime().optional(),
  externalRef: z.string().trim().max(500).optional(),
  sourceUrl: z.string().url().max(2000).optional(),
});
export const updateFeedbackSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']).optional(),
  owner: z.string().trim().max(160).nullable().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  theme: z.string().trim().max(120).nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0, { message: 'Provide at least one field to update.' });

export const updateProductSchema = z.object({ name: z.string().trim().min(2).max(120).optional(), description: z.string().trim().max(2000).nullable().optional() }).strict().refine(v => Object.keys(v).length > 0, { message: 'Provide at least one field to update.' });

import { z } from 'zod';

const riceFields = {
  reach: z.number().int().min(0).max(1_000_000).optional(),
  impact: z.number().min(0).max(10).optional(),
  confidence: z.number().min(0).max(100).optional(),
  effort: z.number().positive().max(100_000).optional(),
};

export const createRequirementSchema = z.object({
  title: z.string().trim().min(3).max(180),
  problem: z.string().trim().max(10000).optional(),
  userStory: z.string().trim().max(10000).optional(),
  acceptance: z.string().trim().max(20000).optional(),
  status: z.enum(['DISCOVERY', 'SCOPED', 'IN_BUILD', 'SHIPPED']).optional(),
  owner: z.string().trim().max(160).nullable().optional(),
  ...riceFields,
  releaseId: z.string().trim().min(1).nullable().optional(),
  initiativeId: z.string().trim().min(1).nullable().optional(),
}).strict();

export const updateRequirementSchema = createRequirementSchema.partial()
  .refine(value => Object.keys(value).length > 0, { message: 'Provide at least one field to update.' });

import { z } from 'zod';
const fields = {
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(10000).optional(),
  status: z.enum(['TODO','IN_PROGRESS','BLOCKED','DONE']).optional(),
  priority: z.enum(['LOW','MEDIUM','HIGH','URGENT']).optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  assigneeLabel: z.string().trim().max(160).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  feedbackId: z.string().min(1).nullable().optional(),
  requirementId: z.string().min(1).nullable().optional(),
  releaseId: z.string().min(1).nullable().optional(),
  initiativeId: z.string().min(1).nullable().optional(),
};
export const createActionItemSchema = z.object(fields).strict();
export const updateActionItemSchema = createActionItemSchema.partial().refine(v => Object.keys(v).length > 0, 'Provide at least one field to update.');

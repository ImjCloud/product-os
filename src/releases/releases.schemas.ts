import { z } from 'zod';
export const createReleaseSchema = z.object({ version: z.string().trim().min(1).max(40), targetDate: z.string().datetime().nullable().optional() }).strict();
export const updateReleaseSchema = z.object({ version: z.string().trim().min(1).max(40).optional(), targetDate: z.string().datetime().nullable().optional(), status: z.enum(['PLANNING','READY','RELEASED']).optional() }).strict().refine(v => Object.keys(v).length > 0);
export const checkSchema = z.object({ completed: z.boolean() }).strict();

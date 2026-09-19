import { z } from 'zod';

export const RedirectParamsSchema = z.object({
    shortCode: z.string().min(1),
});

export const RedirectQuerySchema = z.object({
    ref: z.string().optional(),
});

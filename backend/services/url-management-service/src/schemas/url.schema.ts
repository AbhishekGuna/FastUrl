import { z } from 'zod';

export const CreateUrlSchema = z.object({
    destination: z.url(),
    customAlias: z.string().optional(),
    expiresAt: z.iso.datetime().optional().nullable(),
});

export const ListUrlsQuerySchema = z.object({
    limit: z.coerce.number().min(1).max(100).optional(),
    offset: z.coerce.number().min(0).optional(),
});

export const UrlParamsSchema = z.object({
    shortCode: z.string().min(1),
});

export const UpdateUrlSchema = z.object({
    destination: z.url().optional(),
    status: z.enum(['ACTIVE', 'DISABLED']).optional(),
    expiresAt: z.iso.datetime().optional().nullable(),
});

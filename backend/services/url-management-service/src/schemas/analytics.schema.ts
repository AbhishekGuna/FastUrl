import { z } from 'zod';
import { CUSTOM_ALIAS_PATTERN } from '../regex.js';

export const AnalyticsParamsSchema = z.object({
    shortCode: z.string().min(5).regex(CUSTOM_ALIAS_PATTERN),
});

export const AnalyticsTimeseriesQuerySchema = z.object({
    range: z.enum(['24h', '7d', '30d']).optional().default('7d'),
});

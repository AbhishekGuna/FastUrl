import type { FastifyInstance } from 'fastify';
import { RedirectParamsSchema, RedirectQuerySchema } from '../schemas/redirect.schema.js';
import type { EventPublisher } from '../types.js';
import type { ResolveShortCode } from '../utils/ResolveShortCode.js';

export function registerRedirectRoutes(
    app: FastifyInstance,
    resolveShortCode: ResolveShortCode,
    eventPublisher: EventPublisher,
) {
    app.get('/:shortCode', async (request, reply) => {
        const parsedParams = RedirectParamsSchema.safeParse(request.params);
        if (!parsedParams.success) {
            return reply
                .code(400)
                .send({ error: 'Validation Error', details: parsedParams.error.flatten() });
        }
        const { shortCode } = parsedParams.data;

        const parsedQuery = RedirectQuerySchema.safeParse(request.query || {});
        if (!parsedQuery.success) {
            return reply
                .code(400)
                .send({ error: 'Validation Error', details: parsedQuery.error.flatten() });
        }
        const query = parsedQuery.data;

        const result = await resolveShortCode.execute(shortCode);

        if (result.outcome === 'not_found') return reply.code(404).send();
        if (result.outcome === 'disabled') return reply.code(410).send();
        if (result.outcome === 'expired') return reply.code(410).send();

        // Send the redirect immediately — analytics is fire-and-forget
        reply.code(result.url.redirectType).header('Location', result.url.destination).send();

        const ip = request.ip;

        eventPublisher
            .publishClick({
                shortCode,
                timestamp: new Date().toISOString(),
                ip,
                userAgent: request.headers['user-agent'] ?? '',
                referrer: query.ref ?? request.headers.referer ?? '',
            })
            .catch((err) => request.log.error({ err }, 'Failed to publish click event'));
    });
}

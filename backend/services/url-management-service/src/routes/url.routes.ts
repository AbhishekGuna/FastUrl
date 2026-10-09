import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Redis } from 'ioredis';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createUrlRateLimit } from '../middleware/rateLimit.middleware.js';
import {
    CreateUrlSchema,
    ListUrlsQuerySchema,
    UpdateUrlSchema,
    UrlParamsSchema,
} from '../schemas/url.schema.js';
import type { CreateUrl } from '../services/CreateUrl.js';
import type { GetUrl } from '../services/GetUrl.js';
import type { ListUrls } from '../services/ListUrls.js';
import type { UpdateUrl } from '../services/UpdateUrl.js';
import type { UrlStatus } from '../types.js';

interface Deps {
    createUrl: CreateUrl;
    getUrl: GetUrl;
    updateUrl: UpdateUrl;
    listUrls: ListUrls;
    redis: Redis;
}

import { CREATE_URL_RATE_LIMIT, DOMAIN_ERROR_STATUS } from '../constant.js';

function sendDomainError(reply: FastifyReply, err: unknown) {
    if (err instanceof Error && err.message in DOMAIN_ERROR_STATUS) {
        return reply.code(DOMAIN_ERROR_STATUS[err.message]).send({ error: err.message });
    }
    throw err;
}

export function registerUrlRoutes(app: FastifyInstance, deps: Deps) {
    const createRateLimit = createUrlRateLimit(deps.redis, CREATE_URL_RATE_LIMIT);

    app.post(
        '/api/v1/urls',
        { preHandler: [requireAuth, createRateLimit] },
        async (request, reply) => {
            const userId = request.user?.id;
            if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

            const parsedBody = CreateUrlSchema.safeParse(request.body);
            if (!parsedBody.success) {
                return reply
                    .code(400)
                    .send({ error: 'Validation Error', details: parsedBody.error.flatten() });
            }
            const body = parsedBody.data;

            try {
                const url = await deps.createUrl.execute({ userId, ...body });
                return reply.code(201).send({
                    shortCode: url.shortCode,
                    shortUrl: `${config.shortUrlBase}/${url.shortCode}`,
                    destination: url.destination,
                    expiresAt: url.expiresAt,
                });
            } catch (err) {
                return sendDomainError(reply, err);
            }
        },
    );

    app.get('/api/v1/urls', { preHandler: requireAuth }, async (request, reply) => {
        const userId = request.user?.id;
        console.log('listUrls userId:', userId);
        if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

        const parsedQuery = ListUrlsQuerySchema.safeParse(request.query);
        if (!parsedQuery.success) {
            return reply
                .code(400)
                .send({ error: 'Validation Error', details: parsedQuery.error.flatten() });
        }
        const { limit, offset } = parsedQuery.data;

        return deps.listUrls.execute(userId, limit, offset);
    });

    app.get('/api/v1/urls/:shortCode', { preHandler: requireAuth }, async (request, reply) => {
        const parsedParams = UrlParamsSchema.safeParse(request.params);
        if (!parsedParams.success) {
            return reply
                .code(400)
                .send({ error: 'Validation Error', details: parsedParams.error.flatten() });
        }
        const { shortCode } = parsedParams.data;

        const userId = request.user?.id;
        if (!userId) return reply.code(401).send({ error: 'Unauthorized' });
        const url = await deps.getUrl.execute(shortCode, userId);
        if (!url) return reply.code(404).send();
        return url;
    });

    app.patch('/api/v1/urls/:shortCode', { preHandler: requireAuth }, async (request, reply) => {
        const parsedParams = UrlParamsSchema.safeParse(request.params);
        if (!parsedParams.success) {
            return reply
                .code(400)
                .send({ error: 'Validation Error', details: parsedParams.error.flatten() });
        }
        const { shortCode } = parsedParams.data;

        const parsedBody = UpdateUrlSchema.safeParse(request.body);
        if (!parsedBody.success) {
            return reply
                .code(400)
                .send({ error: 'Validation Error', details: parsedBody.error.flatten() });
        }
        const patch = parsedBody.data;

        const userId = request.user?.id;
        if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

        try {
            const url = await deps.updateUrl.execute(
                shortCode,
                userId,
                patch as { destination?: string; status?: UrlStatus; expiresAt?: string | null },
            );
            if (!url) return reply.code(404).send();
            return url;
        } catch (err) {
            return sendDomainError(reply, err);
        }
    });

    app.delete('/api/v1/urls/:shortCode', { preHandler: requireAuth }, async (request, reply) => {
        const parsedParams = UrlParamsSchema.safeParse(request.params);
        if (!parsedParams.success) {
            return reply
                .code(400)
                .send({ error: 'Validation Error', details: parsedParams.error.flatten() });
        }
        const { shortCode } = parsedParams.data;

        const userId = request.user?.id;
        if (!userId) return reply.code(401).send({ error: 'Unauthorized' });
        const updated = await deps.updateUrl.execute(shortCode, userId, { status: 'DISABLED' });
        if (!updated) return reply.code(404).send();
        return reply.code(204).send();
    });
}

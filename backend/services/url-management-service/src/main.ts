import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError } from 'fastify';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { CreateUrl } from './application/CreateUrl.js';
import { DeleteUrl } from './application/DeleteUrl.js';
import { GetUrl } from './application/GetUrl.js';
import { ListUrls } from './application/ListUrls.js';
import { UpdateUrl } from './application/UpdateUrl.js';
import { config } from './config/index.js';
import { ensureUrlsTable } from './infrastructure/postgres/ensureSchema.js';
import { PostgresUrlRepository } from './infrastructure/postgres/PostgresUrlRepository.js';
import { pool } from './infrastructure/postgres/pool.js';
import { RedisCache } from './infrastructure/redis/RedisCache.js';
import { registerAnalyticsRoutes } from './interfaces/http/routes/analytics.routes.js';
import { authRoutes } from './interfaces/http/routes/auth.routes.js';
import { meRoutes } from './interfaces/http/routes/me.routes.js';
import { registerUrlRoutes } from './interfaces/http/routes/url.routes.js';

async function main() {
    const app = Fastify({ logger: true });

    await ensureUrlsTable(pool);

    const analyticsPool = new Pool({ connectionString: config.databaseUrl });

    const redis = new Redis(config.redisUrl);
    const urlRepository = new PostgresUrlRepository(pool);
    const cache = new RedisCache(redis);

    await app.register(helmet);
    await app.register(cors, { origin: config.corsOrigins });

    await app.register(rateLimit, { max: 300, timeWindow: '1 minute', redis });

    app.setErrorHandler((error: FastifyError, request, reply) => {
        const statusCode = error.statusCode ?? 500;
        if (statusCode >= 500) {
            request.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
        return reply.code(statusCode).send({ error: error.message });
    });

    const urlDeps = {
        createUrl: new CreateUrl(urlRepository, cache),
        getUrl: new GetUrl(urlRepository),
        updateUrl: new UpdateUrl(urlRepository, cache),
        deleteUrl: new DeleteUrl(urlRepository, cache),
        listUrls: new ListUrls(urlRepository),
        redis,
    };

    app.get('/healthz', async () => ({ status: 'ok' }));

    await app.register(authRoutes);
    await app.register(meRoutes);
    registerUrlRoutes(app, urlDeps);
    registerAnalyticsRoutes(app, analyticsPool, pool);

    await app.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

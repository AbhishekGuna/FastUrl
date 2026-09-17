import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError } from 'fastify';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { config } from './config.js';
import { ensureAnalyticsSchema, ensureUrlsTable } from './db/ensureSchema.js';
import { PostgresUrlRepository } from './db/PostgresUrlRepository.js';
import { pool } from './db/pool.js';
import { RedisCache } from './redis/RedisCache.js';
import { registerAnalyticsRoutes } from './routes/analytics.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { meRoutes } from './routes/me.routes.js';
import { registerUrlRoutes } from './routes/url.routes.js';
import { CreateUrl } from './services/CreateUrl.js';
import { GetUrl } from './services/GetUrl.js';
import { ListUrls } from './services/ListUrls.js';
import { UpdateUrl } from './services/UpdateUrl.js';
import { startClickConsumer } from './workers/clickConsumer.js';

async function main() {
    const app = Fastify({ logger: true });

    await ensureUrlsTable(pool);
    await ensureAnalyticsSchema(pool);

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
        listUrls: new ListUrls(urlRepository),
        redis,
    };

    app.get('/healthz', async () => ({ status: 'ok' }));

    await app.register(authRoutes);
    await app.register(meRoutes);
    registerUrlRoutes(app, urlDeps);
    registerAnalyticsRoutes(app, analyticsPool, urlDeps);

    await app.listen({ port: config.port, host: '0.0.0.0' });

    startClickConsumer(redis, analyticsPool, app.log).catch((err) => {
        app.log.fatal({ err }, 'Click consumer crashed — exiting');
        process.exit(1);
    });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

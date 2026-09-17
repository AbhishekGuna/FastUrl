import helmet from '@fastify/helmet';
import Fastify, { type FastifyError } from 'fastify';
import { Redis } from 'ioredis';
import { config } from './config.js';
import { PostgresUrlRepository } from './db/PostgresUrlRepository.js';
import { pool } from './db/pool.js';
import { RedisCache } from './redis/RedisCache.js';
import { RedisEventPublisher } from './redis/RedisEventPublisher.js';
import { registerRedirectRoutes } from './routes/redirect.routes.js';
import { ResolveShortCode } from './utils/ResolveShortCode.js';

async function main() {
    const app = Fastify({ logger: true });

    const redis = new Redis(config.redisUrl);
    const urlRepository = new PostgresUrlRepository(pool);
    const cache = new RedisCache(redis);
    const eventPublisher = new RedisEventPublisher(redis);
    const resolveShortCode = new ResolveShortCode(cache, urlRepository);

    await app.register(helmet);

    app.setErrorHandler((error: FastifyError, request, reply) => {
        const statusCode = error.statusCode ?? 500;
        if (statusCode >= 500) {
            request.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
        return reply.code(statusCode).send({ error: error.message });
    });

    app.get('/healthz', async () => ({ status: 'ok' }));

    registerRedirectRoutes(app, resolveShortCode, eventPublisher);

    await app.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

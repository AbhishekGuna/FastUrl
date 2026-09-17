import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify, { type FastifyError } from 'fastify';
import { Redis } from 'ioredis';
import { config } from './config/index.js';
import { ensureAnalyticsSchema } from './infrastructure/postgres/ensureSchema.js';
import { pool } from './infrastructure/postgres/pool.js';
import { startClickConsumer } from './workers/clickConsumer.js';

async function main() {
    const app = Fastify({ logger: true });

    // Ensure url_clicks table and indexes exist
    await ensureAnalyticsSchema(pool);

    const redis = new Redis(config.redisUrl);

    await app.register(helmet);
    await app.register(cors, { origin: config.corsOrigins });

    app.setErrorHandler((error: FastifyError, request, reply) => {
        const statusCode = error.statusCode ?? 500;
        if (statusCode >= 500) {
            request.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
        return reply.code(statusCode).send({ error: error.message });
    });

    app.get('/healthz', async () => ({ status: 'ok' }));

    await app.listen({ port: config.port, host: '0.0.0.0' });

    // Start the stream consumer in the background after server is up
    startClickConsumer(redis, pool, app.log).catch((err) => {
        app.log.fatal({ err }, 'Click consumer crashed — exiting');
        process.exit(1);
    });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

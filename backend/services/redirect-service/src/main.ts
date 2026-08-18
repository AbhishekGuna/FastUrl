import Fastify, { type FastifyError } from "fastify";
import helmet from "@fastify/helmet";
import { Redis } from "ioredis";
import { config } from "./config/index.js";
import { pool } from "./infrastructure/postgres/pool.js";
import { PostgresUrlRepository } from "./infrastructure/postgres/PostgresUrlRepository.js";
import { RedisCache } from "./infrastructure/redis/RedisCache.js";
import { ResolveShortCode } from "./application/ResolveShortCode.js";
import { registerRedirectRoutes } from "./interfaces/http/routes/redirect.routes.js";

async function main() {
  const app = Fastify({ logger: true });

  const redis = new Redis(config.redisUrl);
  const urlRepository = new PostgresUrlRepository(pool);
  const cache = new RedisCache(redis);
  const resolveShortCode = new ResolveShortCode(cache, urlRepository);

  await app.register(helmet);

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error(error);
      return reply.code(500).send({ error: "Internal Server Error" });
    }
    return reply.code(statusCode).send({ error: error.message });
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  registerRedirectRoutes(app, resolveShortCode);

  await app.listen({ port: config.port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

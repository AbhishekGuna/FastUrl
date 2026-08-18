import Fastify from "fastify";
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

  app.get("/healthz", async () => ({ status: "ok" }));

  registerRedirectRoutes(app, resolveShortCode);

  await app.listen({ port: config.port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

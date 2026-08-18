import Fastify from "fastify";
import { Redis } from "ioredis";
import { config } from "./config/index.js";
import { authRoutes } from "./interfaces/http/routes/auth.routes.js";
import { meRoutes } from "./interfaces/http/routes/me.routes.js";
import { registerUrlRoutes } from "./interfaces/http/routes/url.routes.js";
import { pool } from "./infrastructure/postgres/pool.js";
import { ensureUrlsTable } from "./infrastructure/postgres/ensureSchema.js";
import { PostgresUrlRepository } from "./infrastructure/postgres/PostgresUrlRepository.js";
import { RedisCache } from "./infrastructure/redis/RedisCache.js";
import { CreateUrl } from "./application/CreateUrl.js";
import { GetUrl } from "./application/GetUrl.js";
import { UpdateUrl } from "./application/UpdateUrl.js";
import { DeleteUrl } from "./application/DeleteUrl.js";
import { ListUrls } from "./application/ListUrls.js";

async function main() {
  const app = Fastify({ logger: true });

  await ensureUrlsTable(pool);

  const redis = new Redis(config.redisUrl);
  const urlRepository = new PostgresUrlRepository(pool);
  const cache = new RedisCache(redis);

  const urlDeps = {
    createUrl: new CreateUrl(urlRepository, cache),
    getUrl: new GetUrl(urlRepository),
    updateUrl: new UpdateUrl(urlRepository, cache),
    deleteUrl: new DeleteUrl(urlRepository, cache),
    listUrls: new ListUrls(urlRepository),
  };

  app.get("/healthz", async () => ({ status: "ok" }));

  await app.register(authRoutes);
  await app.register(meRoutes);
  registerUrlRoutes(app, urlDeps);

  await app.listen({ port: config.port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import Fastify from "fastify";
import { config } from "./config/index.js";
import { authRoutes } from "./interfaces/http/routes/auth.routes.js";
import { meRoutes } from "./interfaces/http/routes/me.routes.js";

async function main() {
  const app = Fastify({ logger: true });

  app.get("/healthz", async () => ({ status: "ok" }));

  await app.register(authRoutes);
  await app.register(meRoutes);

  await app.listen({ port: config.port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import Fastify from "fastify";
import { config } from "./config/index.js";

async function main() {
  const app = Fastify({ logger: true });

  app.get("/healthz", async () => ({ status: "ok" }));

  await app.listen({ port: config.port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import type { FastifyInstance } from "fastify";
import type { ResolveShortCode } from "../../../application/ResolveShortCode.js";

export function registerRedirectRoutes(app: FastifyInstance, resolveShortCode: ResolveShortCode) {
  app.get("/:shortCode", async (request, reply) => {
    const { shortCode } = request.params as { shortCode: string };

    const result = await resolveShortCode.execute(shortCode);

    if (result.outcome === "not_found") return reply.code(404).send();
    if (result.outcome === "expired") return reply.code(410).send();

    return reply.code(result.url.redirectType).header("Location", result.url.destination).send();
  });
}

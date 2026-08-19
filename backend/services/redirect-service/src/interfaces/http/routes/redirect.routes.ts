import type { FastifyInstance } from "fastify";
import type { ResolveShortCode } from "../../../application/ResolveShortCode.js";
import type { EventPublisher } from "../../../domain/interfaces/EventPublisher.js";

export function registerRedirectRoutes(
  app: FastifyInstance,
  resolveShortCode: ResolveShortCode,
  eventPublisher: EventPublisher
) {
  app.get("/:shortCode", async (request, reply) => {
    const { shortCode } = request.params as { shortCode: string };

    const result = await resolveShortCode.execute(shortCode);

    if (result.outcome === "not_found") return reply.code(404).send();
    if (result.outcome === "expired") return reply.code(410).send();

    // Send the redirect immediately — analytics is fire-and-forget
    reply.code(result.url.redirectType).header("Location", result.url.destination).send();

    const ip =
      (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ??
      request.ip ??
      "";

    const query = request.query as { ref?: string };

    eventPublisher.publishClick({
      shortCode,
      timestamp: new Date().toISOString(),
      ip,
      userAgent: request.headers["user-agent"] ?? "",
      referrer: query.ref ?? request.headers["referer"] ?? "",
    }).catch((err) => request.log.error({ err }, "Failed to publish click event"));
  });
}

import type { FastifyInstance, FastifyReply } from "fastify";
import type { CreateUrl } from "../../../application/CreateUrl.js";
import type { GetUrl } from "../../../application/GetUrl.js";
import type { UpdateUrl } from "../../../application/UpdateUrl.js";
import type { DeleteUrl } from "../../../application/DeleteUrl.js";
import type { ListUrls } from "../../../application/ListUrls.js";
import type { UrlStatus } from "../../../domain/entities/Url.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { config } from "../../../config/index.js";

interface Deps {
  createUrl: CreateUrl;
  getUrl: GetUrl;
  updateUrl: UpdateUrl;
  deleteUrl: DeleteUrl;
  listUrls: ListUrls;
}

const DOMAIN_ERROR_STATUS: Record<string, number> = {
  INVALID_DESTINATION: 400,
  UNSUPPORTED_PROTOCOL: 400,
  INVALID_ALIAS: 400,
  ALIAS_TAKEN: 409,
  SHORT_CODE_GENERATION_FAILED: 503,
};

function sendDomainError(reply: FastifyReply, err: unknown) {
  if (err instanceof Error && err.message in DOMAIN_ERROR_STATUS) {
    return reply.code(DOMAIN_ERROR_STATUS[err.message]).send({ error: err.message });
  }
  throw err;
}

const VALID_STATUSES: UrlStatus[] = ["ACTIVE", "DISABLED"];

export function registerUrlRoutes(app: FastifyInstance, deps: Deps) {
  app.post("/api/v1/urls", { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.user!.id;
    const body = request.body as {
      destination: string;
      customAlias?: string;
      expiresAt?: string | null;
    };

    try {
      const url = await deps.createUrl.execute({ userId, ...body });
      return reply.code(201).send({
        shortCode: url.shortCode,
        shortUrl: `${config.shortUrlBase}/${url.shortCode}`,
        destination: url.destination,
        expiresAt: url.expiresAt,
      });
    } catch (err) {
      return sendDomainError(reply, err);
    }
  });

  app.get("/api/v1/urls", { preHandler: requireAuth }, async (request) => {
    const userId = request.user!.id;
    const { limit, offset } = request.query as { limit?: string; offset?: string };
    return deps.listUrls.execute(userId, limit ? Number(limit) : undefined, offset ? Number(offset) : undefined);
  });

  // Owner-scoped: this is the management API, not the public redirect
  // path, so a shortCode belonging to someone else 404s the same as one
  // that doesn't exist at all.
  app.get("/api/v1/urls/:shortCode", { preHandler: requireAuth }, async (request, reply) => {
    const { shortCode } = request.params as { shortCode: string };
    const url = await deps.getUrl.execute(shortCode, request.user!.id);
    if (!url) return reply.code(404).send();
    return url;
  });

  app.patch("/api/v1/urls/:shortCode", { preHandler: requireAuth }, async (request, reply) => {
    const { shortCode } = request.params as { shortCode: string };
    const patch = request.body as { destination?: string; status?: string; expiresAt?: string | null };

    if (patch.status !== undefined && !VALID_STATUSES.includes(patch.status as UrlStatus)) {
      return reply.code(400).send({ error: "INVALID_STATUS" });
    }

    try {
      const url = await deps.updateUrl.execute(shortCode, request.user!.id, patch as { destination?: string; status?: UrlStatus; expiresAt?: string | null });
      if (!url) return reply.code(404).send();
      return url;
    } catch (err) {
      return sendDomainError(reply, err);
    }
  });

  app.delete("/api/v1/urls/:shortCode", { preHandler: requireAuth }, async (request, reply) => {
    const { shortCode } = request.params as { shortCode: string };
    const deleted = await deps.deleteUrl.execute(shortCode, request.user!.id);
    if (!deleted) return reply.code(404).send();
    return reply.code(204).send();
  });
}

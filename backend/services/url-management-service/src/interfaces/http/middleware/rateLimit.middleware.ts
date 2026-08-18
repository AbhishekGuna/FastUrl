import type { FastifyReply, FastifyRequest } from "fastify";
import type { Redis } from "ioredis";

export function createUrlRateLimit(redis: Redis, opts: { max: number; windowSeconds: number }) {
  return async function rateLimit(request: FastifyRequest, reply: FastifyReply) {
    const key = `ratelimit:create-url:${request.user!.id}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, opts.windowSeconds);
    }
    if (count > opts.max) {
      const ttl = await redis.ttl(key);
      return reply
        .code(429)
        .header("retry-after", String(Math.max(ttl, 1)))
        .send({ error: "RATE_LIMITED", message: `Too many URLs created. Try again in ${Math.max(ttl, 1)}s.` });
    }
  };
}

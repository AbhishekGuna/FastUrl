export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://fasturl:fasturl@localhost:5432/fasturl",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  clickStreamName: process.env.CLICK_STREAM_NAME ?? "clicks",
  urlCacheTtlSeconds: Number(process.env.URL_CACHE_TTL_SECONDS ?? 3600),
  rateLimit: {
    limit: Number(process.env.RATE_LIMIT_MAX ?? 100),
    windowSeconds: Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 1),
  },
};

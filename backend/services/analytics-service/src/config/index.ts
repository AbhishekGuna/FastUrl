export const config = {
  port: Number(process.env.PORT ?? 4001),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://fasturl:fasturl@localhost:5434/fasturl",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6380",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:8080").split(","),
  // Redis stream consumer settings
  streamKey: "url.clicks.stream",
  consumerGroup: "analytics-workers",
  consumerName: `worker-${process.pid}`,
  batchSize: 50, // XREADGROUP count per poll
  pollIntervalMs: 500,
};

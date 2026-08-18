const port = Number(process.env.PORT ?? 3000);

export const config = {
  port,
  databaseUrl: process.env.DATABASE_URL ?? "postgres://fasturl:fasturl@localhost:5434/fasturl",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6380",
  authSecret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me",
  authUrl: process.env.BETTER_AUTH_URL ?? `http://localhost:${port}`,
  shortUrlBase: process.env.SHORT_URL_BASE ?? `http://localhost:${port}`,
};

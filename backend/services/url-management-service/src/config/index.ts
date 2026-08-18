const port = Number(process.env.PORT ?? 3000);

const DEFAULT_AUTH_SECRET = "dev-secret-change-me";

export const config = {
  port,
  databaseUrl: process.env.DATABASE_URL ?? "postgres://fasturl:fasturl@localhost:5434/fasturl",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6380",
  authSecret: process.env.BETTER_AUTH_SECRET ?? DEFAULT_AUTH_SECRET,
  authUrl: process.env.BETTER_AUTH_URL ?? `http://localhost:${port}`,
  shortUrlBase: process.env.SHORT_URL_BASE ?? `http://localhost:${port}`,
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:8080").split(","),
};

if (process.env.NODE_ENV === "production" && config.authSecret === DEFAULT_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET is set to the default dev value. Generate a real secret " +
      "(`openssl rand -base64 32`) and set BETTER_AUTH_SECRET before running in production."
  );
}

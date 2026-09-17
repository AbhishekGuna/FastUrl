export const config = {
    port: Number(process.env.PORT ?? 4000),
    databaseUrl: process.env.DATABASE_URL ?? 'postgres://fasturl:fasturl@localhost:5434/fasturl',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6380',
    urlCacheTtlSeconds: Number(process.env.URL_CACHE_TTL_SECONDS ?? 3600),
};

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
    AnalyticsParamsSchema,
    AnalyticsTimeseriesQuerySchema,
} from '../schemas/analytics.schema.js';

export interface ClickSummary {
    totalClicks: number;
    topReferrers: { referrer: string; count: number }[];
    topOs: { os: string; count: number }[];
    topBrowsers: { browser: string; count: number }[];
    topDeviceTypes: { deviceType: string; count: number }[];
    topCountries: { country: string; count: number }[];
    topCities: { city: string; count: number }[];
}

export interface TimeSeriesPoint {
    bucket: string;
    clicks: number;
}

import { RANGE_CONFIG } from '../constant.js';
import type { GetUrl } from '../services/GetUrl.js';
import type { Cache } from '../types.js';

export interface AnalyticsDeps {
    getUrl: GetUrl;
    cache: Cache;
}

const ANALYTICS_CACHE_BASE_TTL_SECONDS = 60;

function jitteredTTL(): number {
    return ANALYTICS_CACHE_BASE_TTL_SECONDS + Math.floor(Math.random() * 30);
}

const inflight = new Map<string, Promise<unknown>>();

async function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = inflight.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    const p = fn().finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
}

const SUMMARY_SQL = `
WITH base AS MATERIALIZED (
  SELECT COALESCE(NULLIF(referrer,''),'Direct')     AS referrer,
         COALESCE(NULLIF(os,''),'Unknown')          AS os,
         COALESCE(NULLIF(browser,''),'Unknown')     AS browser,
         COALESCE(NULLIF(device_type,''),'desktop') AS device_type,
         COALESCE(NULLIF(country,''),'Unknown')     AS country,
         COALESCE(NULLIF(city,''),'Unknown')        AS city
  FROM url_clicks WHERE short_code = $1
)
SELECT 'total'       AS dim, NULL::text AS val, COUNT(*)   AS count FROM base
UNION ALL (SELECT 'referrer',    referrer,    COUNT(*) FROM base GROUP BY 2 ORDER BY 3 DESC LIMIT 10)
UNION ALL (SELECT 'os',          os,          COUNT(*) FROM base GROUP BY 2 ORDER BY 3 DESC LIMIT 10)
UNION ALL (SELECT 'browser',     browser,     COUNT(*) FROM base GROUP BY 2 ORDER BY 3 DESC LIMIT 10)
UNION ALL (SELECT 'device_type', device_type, COUNT(*) FROM base GROUP BY 2 ORDER BY 3 DESC)
UNION ALL (SELECT 'country',     country,     COUNT(*) FROM base GROUP BY 2 ORDER BY 3 DESC LIMIT 10)
UNION ALL (SELECT 'city',        city,        COUNT(*) FROM base GROUP BY 2 ORDER BY 3 DESC LIMIT 10)
ORDER BY dim, count DESC`;

export function registerAnalyticsRoutes(
    app: FastifyInstance,
    analyticsPool: Pool,
    deps: AnalyticsDeps,
) {
    /**
     * GET /api/v1/urls/:shortCode/analytics/summary
     * Returns aggregated breakdown: total clicks, top referrers, OS, browser, device, country.
     * Cached in Redis for 60–90 s (base TTL + jitter).
     */
    app.get(
        '/api/v1/urls/:shortCode/analytics/summary',
        { preHandler: requireAuth },
        async (request, reply) => {
            const parsedParams = AnalyticsParamsSchema.safeParse(request.params);
            if (!parsedParams.success) {
                return reply
                    .code(400)
                    .send({ error: 'Validation Error', details: parsedParams.error.flatten() });
            }
            const { shortCode } = parsedParams.data;

            const userId = request.user?.id;
            if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

            const url = await deps.getUrl.execute(shortCode, userId);
            if (!url) return reply.code(404).send({ error: 'Not found' });

            const cacheKey = `analytics:summary:${shortCode}`;

            const cached = await deps.cache.get<ClickSummary>(cacheKey);
            if (cached) {
                return reply.send(cached);
            }

            const summary = await singleFlight<ClickSummary>(cacheKey, async () => {
                const { rows } = await analyticsPool.query<{
                    dim: string;
                    val: string | null;
                    count: string;
                }>(SUMMARY_SQL, [shortCode]);

                const pick = (dim: string) => rows.filter((r) => r.dim === dim);

                const result: ClickSummary = {
                    totalClicks: Number(pick('total')[0]?.count ?? 0),
                    topReferrers: pick('referrer').map((r) => ({
                        referrer: r.val ?? '',
                        count: Number(r.count),
                    })),
                    topOs: pick('os').map((r) => ({ os: r.val ?? '', count: Number(r.count) })),
                    topBrowsers: pick('browser').map((r) => ({
                        browser: r.val ?? '',
                        count: Number(r.count),
                    })),
                    topDeviceTypes: pick('device_type').map((r) => ({
                        deviceType: r.val ?? '',
                        count: Number(r.count),
                    })),
                    topCountries: pick('country').map((r) => ({
                        country: r.val ?? '',
                        count: Number(r.count),
                    })),
                    topCities: pick('city').map((r) => ({
                        city: r.val ?? '',
                        count: Number(r.count),
                    })),
                };

                await deps.cache.set(cacheKey, result, jitteredTTL());
                return result;
            });

            return reply.send(summary);
        },
    );

    /**
     * GET /api/v1/urls/:shortCode/analytics/timeseries?range=7d
     * range: '24h' | '7d' | '30d'  (default: '7d')
     * Cached in Redis for 60–90 s (base TTL + jitter), keyed per shortCode + range.
     */
    app.get(
        '/api/v1/urls/:shortCode/analytics/timeseries',
        { preHandler: requireAuth },
        async (request, reply) => {
            const parsedParams = AnalyticsParamsSchema.safeParse(request.params);
            if (!parsedParams.success) {
                return reply
                    .code(400)
                    .send({ error: 'Validation Error', details: parsedParams.error.flatten() });
            }
            const { shortCode } = parsedParams.data;

            const parsedQuery = AnalyticsTimeseriesQuerySchema.safeParse(request.query || {});
            if (!parsedQuery.success) {
                return reply
                    .code(400)
                    .send({ error: 'Validation Error', details: parsedQuery.error.flatten() });
            }
            const { range } = parsedQuery.data;

            const userId = request.user?.id;
            if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

            const url = await deps.getUrl.execute(shortCode, userId);
            if (!url) return reply.code(404).send({ error: 'Not found' });

            const cacheKey = `analytics:timeseries:${shortCode}:${range}`;

            const cached = await deps.cache.get<TimeSeriesPoint[]>(cacheKey);
            if (cached) {
                return reply.send(cached);
            }

            const { interval, trunc } = RANGE_CONFIG[range] ?? RANGE_CONFIG['7d'];

            const points = await singleFlight<TimeSeriesPoint[]>(cacheKey, async () => {
                const { rows } = await analyticsPool.query<{ bucket: Date; clicks: string }>(
                    `SELECT date_trunc($1, clicked_at) AS bucket, COUNT(*) AS clicks
             FROM url_clicks
             WHERE short_code = $2
               AND clicked_at >= now() - $3::interval
             GROUP BY 1
             ORDER BY 1 ASC`,
                    [trunc, shortCode, interval],
                );

                const result: TimeSeriesPoint[] = rows.map((r) => ({
                    bucket: r.bucket.toISOString(),
                    clicks: Number(r.clicks),
                }));

                await deps.cache.set(cacheKey, result, jitteredTTL());
                return result;
            });

            return reply.send(points);
        },
    );
}

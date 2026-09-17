import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { requireAuth } from '../middleware/auth.middleware.js';

export interface ClickSummary {
    totalClicks: number;
    topReferrers: { referrer: string; count: number }[];
    topOs: { os: string; count: number }[];
    topBrowsers: { browser: string; count: number }[];
    topDeviceTypes: { deviceType: string; count: number }[];
    topCountries: { country: string; count: number }[];
}

export interface TimeSeriesPoint {
    bucket: string;
    clicks: number;
}

const RANGE_CONFIG: Record<string, { interval: string; trunc: string }> = {
    '24h': { interval: '24 hours', trunc: 'hour' },
    '7d': { interval: '7 days', trunc: 'day' },
    '30d': { interval: '30 days', trunc: 'day' },
};

import type { GetUrl } from '../services/GetUrl.js';

export interface AnalyticsDeps {
    getUrl: GetUrl;
}

export function registerAnalyticsRoutes(
    app: FastifyInstance,
    analyticsPool: Pool,
    deps: AnalyticsDeps,
) {
    /**
     * GET /api/v1/urls/:shortCode/analytics/summary
     * Returns aggregated breakdown: total clicks, top referrers, OS, browser, device, country.
     */
    app.get(
        '/api/v1/urls/:shortCode/analytics/summary',
        { preHandler: requireAuth },
        async (request, reply) => {
            const { shortCode } = request.params as { shortCode: string };
            const userId = request.user?.id;
            if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

            const url = await deps.getUrl.execute(shortCode, userId);
            if (!url) return reply.code(404).send({ error: 'Not found' });

            const [totalResult, referrers, os, browsers, devices, countries] = await Promise.all([
                analyticsPool.query<{ total: string }>(
                    `SELECT COUNT(*) AS total FROM url_clicks WHERE short_code = $1`,
                    [shortCode],
                ),
                analyticsPool.query<{ referrer: string; count: string }>(
                    `SELECT COALESCE(NULLIF(referrer, ''), 'Direct') AS referrer, COUNT(*) AS count
           FROM url_clicks WHERE short_code = $1
           GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
                    [shortCode],
                ),
                analyticsPool.query<{ os: string; count: string }>(
                    `SELECT COALESCE(NULLIF(os, ''), 'Unknown') AS os, COUNT(*) AS count
           FROM url_clicks WHERE short_code = $1
           GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
                    [shortCode],
                ),
                analyticsPool.query<{ browser: string; count: string }>(
                    `SELECT COALESCE(NULLIF(browser, ''), 'Unknown') AS browser, COUNT(*) AS count
           FROM url_clicks WHERE short_code = $1
           GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
                    [shortCode],
                ),
                analyticsPool.query<{ device_type: string; count: string }>(
                    `SELECT COALESCE(NULLIF(device_type, ''), 'desktop') AS device_type, COUNT(*) AS count
           FROM url_clicks WHERE short_code = $1
           GROUP BY 1 ORDER BY 2 DESC`,
                    [shortCode],
                ),
                analyticsPool.query<{ country: string; count: string }>(
                    `SELECT COALESCE(NULLIF(country, ''), 'Unknown') AS country, COUNT(*) AS count
           FROM url_clicks WHERE short_code = $1
           GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
                    [shortCode],
                ),
            ]);

            const summary: ClickSummary = {
                totalClicks: Number(totalResult.rows[0]?.total ?? 0),
                topReferrers: referrers.rows.map((r) => ({
                    referrer: r.referrer,
                    count: Number(r.count),
                })),
                topOs: os.rows.map((r) => ({ os: r.os, count: Number(r.count) })),
                topBrowsers: browsers.rows.map((r) => ({
                    browser: r.browser,
                    count: Number(r.count),
                })),
                topDeviceTypes: devices.rows.map((r) => ({
                    deviceType: r.device_type,
                    count: Number(r.count),
                })),
                topCountries: countries.rows.map((r) => ({
                    country: r.country,
                    count: Number(r.count),
                })),
            };

            return reply.send(summary);
        },
    );

    /**
     * GET /api/v1/urls/:shortCode/analytics/timeseries?range=7d
     * range: '24h' | '7d' | '30d'  (default: '7d')
     */
    app.get(
        '/api/v1/urls/:shortCode/analytics/timeseries',
        { preHandler: requireAuth },
        async (request, reply) => {
            const { shortCode } = request.params as { shortCode: string };
            const { range = '7d' } = request.query as { range?: string };
            const userId = request.user?.id;
            if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

            const url = await deps.getUrl.execute(shortCode, userId);
            if (!url) return reply.code(404).send({ error: 'Not found' });

            const { interval, trunc } = RANGE_CONFIG[range] ?? RANGE_CONFIG['7d'];

            const { rows } = await analyticsPool.query<{ bucket: Date; clicks: string }>(
                `SELECT date_trunc($1, clicked_at) AS bucket, COUNT(*) AS clicks
         FROM url_clicks
         WHERE short_code = $2
           AND clicked_at >= now() - $3::interval
         GROUP BY 1
         ORDER BY 1 ASC`,
                [trunc, shortCode, interval],
            );

            const points: TimeSeriesPoint[] = rows.map((r) => ({
                bucket: r.bucket.toISOString(),
                clicks: Number(r.clicks),
            }));

            return reply.send(points);
        },
    );
}

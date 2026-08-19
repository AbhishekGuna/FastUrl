import type { Pool } from "pg";

export interface ClickSummary {
  totalClicks: number;
  topReferrers: { referrer: string; count: number }[];
  topOs: { os: string; count: number }[];
  topBrowsers: { browser: string; count: number }[];
  topDeviceTypes: { deviceType: string; count: number }[];
  topCountries: { country: string; count: number }[];
}

export interface TimeSeriesPoint {
  bucket: string; // ISO date string (hour or day depending on range)
  clicks: number;
}

export class AnalyticsRepository {
  constructor(private readonly pool: Pool) {}

  async getSummary(shortCode: string): Promise<ClickSummary> {
    const [totalResult, referrers, os, browsers, devices, countries] = await Promise.all([
      this.pool.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM url_clicks WHERE short_code = $1`,
        [shortCode]
      ),
      this.pool.query<{ referrer: string; count: string }>(
        `SELECT COALESCE(NULLIF(referrer, ''), 'Direct') AS referrer, COUNT(*) AS count
         FROM url_clicks WHERE short_code = $1
         GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
        [shortCode]
      ),
      this.pool.query<{ os: string; count: string }>(
        `SELECT COALESCE(NULLIF(os, ''), 'Unknown') AS os, COUNT(*) AS count
         FROM url_clicks WHERE short_code = $1
         GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
        [shortCode]
      ),
      this.pool.query<{ browser: string; count: string }>(
        `SELECT COALESCE(NULLIF(browser, ''), 'Unknown') AS browser, COUNT(*) AS count
         FROM url_clicks WHERE short_code = $1
         GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
        [shortCode]
      ),
      this.pool.query<{ device_type: string; count: string }>(
        `SELECT COALESCE(NULLIF(device_type, ''), 'desktop') AS device_type, COUNT(*) AS count
         FROM url_clicks WHERE short_code = $1
         GROUP BY 1 ORDER BY 2 DESC`,
        [shortCode]
      ),
      this.pool.query<{ country: string; count: string }>(
        `SELECT COALESCE(NULLIF(country, ''), 'Unknown') AS country, COUNT(*) AS count
         FROM url_clicks WHERE short_code = $1
         GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
        [shortCode]
      ),
    ]);

    return {
      totalClicks: Number(totalResult.rows[0]?.total ?? 0),
      topReferrers: referrers.rows.map((r) => ({ referrer: r.referrer, count: Number(r.count) })),
      topOs: os.rows.map((r) => ({ os: r.os, count: Number(r.count) })),
      topBrowsers: browsers.rows.map((r) => ({ browser: r.browser, count: Number(r.count) })),
      topDeviceTypes: devices.rows.map((r) => ({ deviceType: r.device_type, count: Number(r.count) })),
      topCountries: countries.rows.map((r) => ({ country: r.country, count: Number(r.count) })),
    };
  }

  /**
   * Returns time-series click counts.
   * @param range '24h' | '7d' | '30d'
   */
  async getTimeSeries(shortCode: string, range: string): Promise<TimeSeriesPoint[]> {
    const rangeConfig: Record<string, { interval: string; trunc: string }> = {
      "24h": { interval: "24 hours", trunc: "hour" },
      "7d":  { interval: "7 days",   trunc: "day" },
      "30d": { interval: "30 days",  trunc: "day" },
    };

    const { interval, trunc } = rangeConfig[range] ?? rangeConfig["7d"];

    const { rows } = await this.pool.query<{ bucket: Date; clicks: string }>(
      `SELECT date_trunc($1, clicked_at) AS bucket, COUNT(*) AS clicks
       FROM url_clicks
       WHERE short_code = $2
         AND clicked_at >= now() - $3::interval
       GROUP BY 1
       ORDER BY 1 ASC`,
      [trunc, shortCode, interval]
    );

    return rows.map((r) => ({
      bucket: r.bucket.toISOString(),
      clicks: Number(r.clicks),
    }));
  }
}

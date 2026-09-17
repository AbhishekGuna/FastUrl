import type { Pool } from 'pg';

export async function ensureAnalyticsSchema(pool: Pool): Promise<void> {
    await pool.query(`
    -- Detailed click-level event log
    CREATE TABLE IF NOT EXISTS url_clicks (
      id            BIGSERIAL PRIMARY KEY,
      short_code    VARCHAR(16)  NOT NULL,
      clicked_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
      ip            TEXT         NOT NULL DEFAULT '',
      user_agent    TEXT         NOT NULL DEFAULT '',
      referrer      TEXT         NOT NULL DEFAULT '',
      -- Parsed fields (resolved by analytics-service worker)
      country       VARCHAR(2)   NOT NULL DEFAULT '',  -- ISO 3166-1 alpha-2
      os            VARCHAR(64)  NOT NULL DEFAULT '',
      browser       VARCHAR(64)  NOT NULL DEFAULT '',
      device_type   VARCHAR(32)  NOT NULL DEFAULT ''   -- 'mobile' | 'desktop' | 'tablet' | ''
    );

    -- Indexes optimised for the queries the API will run
    CREATE INDEX IF NOT EXISTS idx_clicks_short_code_at
      ON url_clicks (short_code, clicked_at DESC);

    CREATE INDEX IF NOT EXISTS idx_clicks_country
      ON url_clicks (short_code, country);

    CREATE INDEX IF NOT EXISTS idx_clicks_os
      ON url_clicks (short_code, os);

    CREATE INDEX IF NOT EXISTS idx_clicks_browser
      ON url_clicks (short_code, browser);

    CREATE INDEX IF NOT EXISTS idx_clicks_device
      ON url_clicks (short_code, device_type);
  `);
}

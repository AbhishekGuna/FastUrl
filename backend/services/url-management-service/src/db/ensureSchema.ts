import type { Pool } from 'pg';

export async function ensureUrlsTable(pool: Pool): Promise<void> {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS urls (
        id             BIGSERIAL PRIMARY KEY,
        short_code     VARCHAR(16) NOT NULL,
        user_id        TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        destination    TEXT NOT NULL,
        status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        redirect_type  SMALLINT NOT NULL DEFAULT 302,
        click_count    BIGINT NOT NULL DEFAULT 0,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at     TIMESTAMPTZ,
        UNIQUE (short_code)
    );

    CREATE INDEX IF NOT EXISTS idx_urls_user_created ON urls (user_id, created_at DESC);
  `);
}
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
      -- Parsed fields (resolved by click consumer worker)
      country       VARCHAR(2)   NOT NULL DEFAULT '',  -- ISO 3166-1 alpha-2
      city          VARCHAR(100) NOT NULL DEFAULT '',
      os            VARCHAR(64)  NOT NULL DEFAULT '',
      browser       VARCHAR(64)  NOT NULL DEFAULT '',
      device_type   VARCHAR(32)  NOT NULL DEFAULT ''   -- 'mobile' | 'desktop' | 'tablet' | ''
    );

    ALTER TABLE url_clicks ADD COLUMN IF NOT EXISTS city VARCHAR(100) NOT NULL DEFAULT '';

    -- Indexes optimised for the queries the API will run
    CREATE INDEX IF NOT EXISTS idx_clicks_short_code_at
      ON url_clicks (short_code, clicked_at DESC);

    CREATE INDEX IF NOT EXISTS idx_clicks_country
      ON url_clicks (short_code, country);

    CREATE INDEX IF NOT EXISTS idx_clicks_city
      ON url_clicks (short_code, city);

    CREATE INDEX IF NOT EXISTS idx_clicks_os
      ON url_clicks (short_code, os);

    CREATE INDEX IF NOT EXISTS idx_clicks_browser
      ON url_clicks (short_code, browser);

    CREATE INDEX IF NOT EXISTS idx_clicks_device
      ON url_clicks (short_code, device_type);
  `);
}

export async function ensureAuthSchema(pool: Pool): Promise<void> {
    await pool.query(`
CREATE TABLE IF NOT EXISTS "user" (
    id text PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    "emailVerified" boolean NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS session (
    id text PRIMARY KEY,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL UNIQUE,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
    id text PRIMARY KEY,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS verification (
    id text PRIMARY KEY,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS session_userId_idx ON session ("userId");
CREATE INDEX IF NOT EXISTS account_userId_idx ON account ("userId");
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier);
`);
}

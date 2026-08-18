import type { Pool } from "pg";

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

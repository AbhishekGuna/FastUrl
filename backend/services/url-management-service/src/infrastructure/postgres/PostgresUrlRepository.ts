import type { Pool } from "pg";
import type { Url } from "../../domain/entities/Url.js";
import type { NewUrl, UpdateUrlPatch, UrlRepository } from "../../domain/interfaces/UrlRepository.js";

export class PostgresUrlRepository implements UrlRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: NewUrl): Promise<Url> {
    const { rows } = await this.pool.query(
      `INSERT INTO urls (short_code, user_id, destination, redirect_type, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.shortCode, input.userId, input.destination, input.redirectType, input.expiresAt]
    );
    return mapRow(rows[0]);
  }

  async findByShortCode(shortCode: string): Promise<Url | null> {
    const { rows } = await this.pool.query(`SELECT * FROM urls WHERE short_code = $1`, [shortCode]);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async findByUser(userId: string, limit: number, offset: number): Promise<Url[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM urls WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return rows.map(mapRow);
  }

  async update(shortCode: string, userId: string, patch: UpdateUrlPatch): Promise<Url | null> {
    const { rows } = await this.pool.query(
      `UPDATE urls SET
         destination = COALESCE($3, destination),
         status = COALESCE($4, status),
         expires_at = COALESCE($5, expires_at)
       WHERE short_code = $1 AND user_id = $2
       RETURNING *`,
      [shortCode, userId, patch.destination ?? null, patch.status ?? null, patch.expiresAt ?? null]
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async existsByShortCode(shortCode: string): Promise<boolean> {
    const { rows } = await this.pool.query(`SELECT 1 FROM urls WHERE short_code = $1`, [shortCode]);
    return rows.length > 0;
  }
}

function mapRow(row: Record<string, any>): Url {
  return {
    id: String(row.id),
    shortCode: row.short_code,
    userId: String(row.user_id),
    destination: row.destination,
    status: row.status,
    redirectType: row.redirect_type,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    clickCount: Number(row.click_count),
  };
}

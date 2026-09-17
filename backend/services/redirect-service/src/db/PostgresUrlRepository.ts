import type { Pool } from 'pg';
import type { Url, UrlRepository } from '../types.js';

export class PostgresUrlRepository implements UrlRepository {
    constructor(private readonly pool: Pool) {}

    async findByShortCode(shortCode: string): Promise<Url | null> {
        const { rows } = await this.pool.query(`SELECT * FROM urls WHERE short_code = $1`, [
            shortCode,
        ]);
        return rows[0] ? mapRow(rows[0]) : null;
    }
}

interface UrlRow {
    id: number | string;
    short_code: string;
    user_id: number | string;
    destination: string;
    status: Url['status'];
    redirect_type: number;
    created_at: Date;
    expires_at: Date | null;
    click_count: number | string;
}

function mapRow(row: UrlRow): Url {
    return {
        id: String(row.id),
        shortCode: row.short_code,
        userId: String(row.user_id),
        destination: row.destination,
        status: row.status,
        redirectType: row.redirect_type as Url['redirectType'],
        createdAt: row.created_at.toISOString(),
        expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
        clickCount: Number(row.click_count),
    };
}

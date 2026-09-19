import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Redis } from 'ioredis';
import * as maxmind from 'maxmind';
import type { Pool } from 'pg';
import { UAParser } from 'ua-parser-js';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../data/geoip/GeoLite2-City.mmdb');

let geoLookup: maxmind.Reader<maxmind.CityResponse> | null = null;
async function getGeoLookup() {
    if (!geoLookup) {
        geoLookup = await maxmind.open<maxmind.CityResponse>(dbPath);
    }
    return geoLookup;
}

/**
 * Raw fields as stored in the Redis Stream by the redirect-service.
 */
interface RawStreamEntry {
    messageId: string;
    shortCode: string;
    timestamp: string;
    ip: string;
    userAgent: string;
    referrer: string;
}

/**
 * Ensures the Redis consumer group exists (idempotent).
 * Uses $ so new consumers only pick up messages written after group creation.
 */
async function ensureConsumerGroup(redis: Redis): Promise<void> {
    try {
        await redis.xgroup('CREATE', config.streamKey, config.consumerGroup, '$', 'MKSTREAM');
    } catch (err: unknown) {
        // BUSYGROUP = group already exists, that's fine
        if (err instanceof Error && !err.message.includes('BUSYGROUP')) throw err;
        if (!(err instanceof Error)) throw err;
    }
}

/**
 * Parse a flat Redis stream entry array into a typed object.
 * ioredis returns entries as [id, [field, value, field, value …]]
 */
function parseStreamEntry(id: string, fields: string[]): RawStreamEntry {
    const map: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
        map[fields[i]] = fields[i + 1];
    }
    return {
        messageId: id,
        shortCode: map.shortCode ?? '',
        timestamp: map.timestamp ?? new Date().toISOString(),
        ip: map.ip ?? '',
        userAgent: map.userAgent ?? '',
        referrer: map.referrer ?? '',
    };
}

function parseUserAgent(ua: string) {
    const result = new UAParser(ua).getResult();
    const deviceType = result.device.type ?? (ua ? 'desktop' : '');
    const os = result.os.name ?? '';
    const browser = result.browser.name ?? '';
    return { os, browser, deviceType };
}

/**
 * Resolves an IPv4/IPv6 address to an ISO 3166-1 alpha-2 country code and city name.
 */
function lookupGeo(ip: string, lookup: maxmind.Reader<maxmind.CityResponse>) {
    if (!ip) return { country: '', city: '' };
    const geo = lookup.get(ip);
    return {
        country: geo?.country?.iso_code ?? geo?.registered_country?.iso_code ?? '',
        city: geo?.city?.names?.en ?? '',
    };
}

async function processBatch(
    entries: RawStreamEntry[],
    pool: Pool,
    redis: Redis,
    logger: {
        info: (meta: unknown, msg?: string) => void;
        error: (meta: unknown, msg?: string) => void;
        debug: (meta: unknown, msg?: string) => void;
    },
    isPending = false,
): Promise<void> {
    if (entries.length === 0) return;

    const lookup = await getGeoLookup();

    try {
        // Build a multi-row INSERT for efficiency
        const values: unknown[] = [];
        const placeholders = entries.map((e, idx) => {
            const { os, browser, deviceType } = parseUserAgent(e.userAgent);
            const { country, city } = lookupGeo(e.ip, lookup);
            const base = idx * 10;
            values.push(
                e.shortCode,
                e.timestamp,
                e.ip,
                e.userAgent,
                e.referrer,
                country,
                city,
                os,
                browser,
                deviceType,
            );
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`;
        });

        await pool.query(
            `INSERT INTO url_clicks
           (short_code, clicked_at, ip, user_agent, referrer, country, city, os, browser, device_type)
         VALUES ${placeholders.join(', ')}`,
            values,
        );

        const ids = entries.map((e) => e.messageId);
        await redis.xack(config.streamKey, config.consumerGroup, ...ids);

        if (isPending) {
            logger.info({ count: ids.length }, 'Re-processed pending clicks');
        } else {
            logger.debug({ count: ids.length }, 'Processed click batch');
        }
    } catch (err) {
        logger.error({ err }, 'Batch insert failed, falling back to individual processing');

        for (const e of entries) {
            try {
                const { os, browser, deviceType } = parseUserAgent(e.userAgent);
                const { country, city } = lookupGeo(e.ip, lookup);

                await pool.query(
                    `INSERT INTO url_clicks
                   (short_code, clicked_at, ip, user_agent, referrer, country, city, os, browser, device_type)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        e.shortCode,
                        e.timestamp,
                        e.ip,
                        e.userAgent,
                        e.referrer,
                        country,
                        city,
                        os,
                        browser,
                        deviceType,
                    ],
                );

                await redis.xack(config.streamKey, config.consumerGroup, e.messageId);
            } catch (singleErr) {
                logger.error(
                    { err: singleErr, messageId: e.messageId },
                    'Failed to process individual message, sending to DLQ',
                );

                try {
                    await redis.xadd(
                        `${config.streamKey}:dlq`,
                        '*',
                        'originalId',
                        e.messageId,
                        'shortCode',
                        e.shortCode,
                        'timestamp',
                        e.timestamp,
                        'ip',
                        e.ip,
                        'userAgent',
                        e.userAgent,
                        'referrer',
                        e.referrer,
                        'error',
                        singleErr instanceof Error ? singleErr.message : String(singleErr),
                    );
                } catch (dlqErr) {
                    logger.error(
                        { err: dlqErr, messageId: e.messageId },
                        'Failed to send message to DLQ',
                    );
                }

                // ACK the bad message anyway to prevent poison pill loop
                await redis.xack(config.streamKey, config.consumerGroup, e.messageId);
            }
        }
    }
}

/**
 * Long-running worker loop that reads from the Redis Stream consumer group,
 * processes each batch, inserts into Postgres, then ACKs the messages.
 */
export async function startClickConsumer(
    redis: Redis,
    pool: Pool,
    logger: {
        info: (meta: unknown, msg?: string) => void;
        error: (meta: unknown, msg?: string) => void;
        debug: (meta: unknown, msg?: string) => void;
    },
): Promise<void> {
    await ensureConsumerGroup(redis);
    logger.info(
        { streamKey: config.streamKey, group: config.consumerGroup, consumer: config.consumerName },
        'Click consumer started',
    );

    while (true) {
        try {
            // Claim any pending (unacked) messages first so we don't drop events on crash/restart
            const pending = await redis.xautoclaim(
                config.streamKey,
                config.consumerGroup,
                config.consumerName,
                60_000, // min-idle-time ms before reclaiming
                '0-0',
                'COUNT',
                config.batchSize,
            );
            // xautoclaim returns [next-start-id, [[id, fields], ...]]
            const pendingEntries: RawStreamEntry[] = (pending[1] as [string, string[]][]).map(
                ([id, fields]) => parseStreamEntry(id, fields),
            );

            if (pendingEntries.length > 0) {
                await processBatch(pendingEntries, pool, redis, logger, true);
            }

            // Now read new messages
            const response = await (
                redis as unknown as Omit<Redis, 'xreadgroup'> & {
                    xreadgroup: (...args: (string | number)[]) => Promise<unknown>;
                }
            ).xreadgroup(
                'GROUP',
                config.consumerGroup,
                config.consumerName,
                'COUNT',
                config.batchSize,
                'BLOCK',
                config.pollIntervalMs,
                'STREAMS',
                config.streamKey,
                '>',
            );

            if (!response) continue; // timeout — no new messages

            const respArray = response as [string, [string, string[]][]][];
            const [, messages] = respArray[0];
            const entries = messages.map(([id, fields]) => parseStreamEntry(id, fields));

            await processBatch(entries, pool, redis, logger, false);
        } catch (err) {
            logger.error({ err }, 'Click consumer error — retrying after 2s');
            await new Promise((r) => setTimeout(r, 2000));
        }
    }
}

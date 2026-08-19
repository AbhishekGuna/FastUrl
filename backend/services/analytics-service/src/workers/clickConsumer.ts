import { UAParser } from "ua-parser-js";
import type { Pool } from "pg";
import type { Redis } from "ioredis";
import { config } from "../config/index.js";

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
    await redis.xgroup(
      "CREATE",
      config.streamKey,
      config.consumerGroup,
      "$",
      "MKSTREAM"
    );
  } catch (err: any) {
    // BUSYGROUP = group already exists, that's fine
    if (!err.message?.includes("BUSYGROUP")) throw err;
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
    shortCode: map["shortCode"] ?? "",
    timestamp: map["timestamp"] ?? new Date().toISOString(),
    ip: map["ip"] ?? "",
    userAgent: map["userAgent"] ?? "",
    referrer: map["referrer"] ?? "",
  };
}

function parseUserAgent(ua: string) {
  const result = new UAParser(ua).getResult();
  const deviceType = result.device.type ?? (ua ? "desktop" : "");
  const os = result.os.name ?? "";
  const browser = result.browser.name ?? "";
  return { os, browser, deviceType };
}

async function processBatch(entries: RawStreamEntry[], pool: Pool): Promise<void> {
  if (entries.length === 0) return;

  // Build a multi-row INSERT for efficiency
  const values: unknown[] = [];
  const placeholders = entries.map((e, idx) => {
    const { os, browser, deviceType } = parseUserAgent(e.userAgent);
    const base = idx * 8;
    values.push(
      e.shortCode,
      e.timestamp,
      e.ip,
      e.userAgent,
      e.referrer,
      os,
      browser,
      deviceType
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
  });

  await pool.query(
    `INSERT INTO url_clicks
       (short_code, clicked_at, ip, user_agent, referrer, os, browser, device_type)
     VALUES ${placeholders.join(", ")}`,
    values
  );
}

/**
 * Long-running worker loop that reads from the Redis Stream consumer group,
 * processes each batch, inserts into Postgres, then ACKs the messages.
 */
export async function startClickConsumer(redis: Redis, pool: Pool, logger: any): Promise<void> {
  await ensureConsumerGroup(redis);
  logger.info(
    { streamKey: config.streamKey, group: config.consumerGroup, consumer: config.consumerName },
    "Click consumer started"
  );

  while (true) {
    try {
      // Claim any pending (unacked) messages first so we don't drop events on crash/restart
      const pending = await redis.xautoclaim(
        config.streamKey,
        config.consumerGroup,
        config.consumerName,
        60_000, // min-idle-time ms before reclaiming
        "0-0",
        "COUNT",
        config.batchSize
      );
      // xautoclaim returns [next-start-id, [[id, fields], ...]]
      const pendingEntries: RawStreamEntry[] = (pending[1] as [string, string[]][])
        .map(([id, fields]) => parseStreamEntry(id, fields));

      if (pendingEntries.length > 0) {
        await processBatch(pendingEntries, pool);
        const ids = pendingEntries.map((e) => e.messageId);
        await redis.xack(config.streamKey, config.consumerGroup, ...ids);
        logger.info({ count: ids.length }, "Re-processed pending clicks");
      }

      // Now read new messages
      const response = await (redis as any).xreadgroup(
        "GROUP",
        config.consumerGroup,
        config.consumerName,
        "COUNT",
        config.batchSize,
        "BLOCK",
        config.pollIntervalMs,
        "STREAMS",
        config.streamKey,
        ">"
      );

      if (!response) continue; // timeout — no new messages

      const [, messages] = response[0] as [string, [string, string[]][]];
      const entries = messages.map(([id, fields]) => parseStreamEntry(id, fields));

      await processBatch(entries, pool);

      const ids = entries.map((e) => e.messageId);
      await redis.xack(config.streamKey, config.consumerGroup, ...ids);
      logger.debug({ count: ids.length }, "Processed click batch");
    } catch (err) {
      logger.error({ err }, "Click consumer error — retrying after 2s");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

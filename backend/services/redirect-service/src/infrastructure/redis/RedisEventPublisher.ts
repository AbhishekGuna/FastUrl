import type { Redis } from "ioredis";
import type { EventPublisher, RawClickEvent } from "../../domain/interfaces/EventPublisher.js";

const STREAM_KEY = "url.clicks.stream";
// Keep the stream trimmed to ~1M events to prevent unbounded growth
const STREAM_MAXLEN = 1_000_000;

export class RedisEventPublisher implements EventPublisher {
  constructor(private readonly redis: Redis) {}

  async publishClick(event: RawClickEvent): Promise<void> {
    await this.redis.xadd(
      STREAM_KEY,
      "MAXLEN",
      "~",
      String(STREAM_MAXLEN),
      "*", // auto-generate stream ID
      "shortCode", event.shortCode,
      "timestamp", event.timestamp,
      "ip", event.ip,
      "userAgent", event.userAgent,
      "referrer", event.referrer
    );
  }
}

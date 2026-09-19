import type { Redis } from 'ioredis';
import { STREAM_KEY, STREAM_MAXLEN } from '../constant.js';
import type { EventPublisher, RawClickEvent } from '../types.js';

export class RedisEventPublisher implements EventPublisher {
    constructor(private readonly redis: Redis) {}

    async publishClick(event: RawClickEvent): Promise<void> {
        await this.redis.xadd(
            STREAM_KEY,
            'MAXLEN',
            '~',
            String(STREAM_MAXLEN),
            '*', // auto-generate stream ID
            'shortCode',
            event.shortCode,
            'timestamp',
            event.timestamp,
            'ip',
            event.ip,
            'userAgent',
            event.userAgent,
            'referrer',
            event.referrer,
        );
    }
}

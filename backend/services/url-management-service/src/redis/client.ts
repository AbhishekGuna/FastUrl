/**
 * Shared ioredis singleton.
 * Imported by auth.ts (secondaryStorage), main.ts (rate limiting / cache),
 * and any other module that needs Redis — no double-connections.
 */
import { Redis } from 'ioredis';
import { config } from '../config.js';

export const redis = new Redis(config.redisUrl);

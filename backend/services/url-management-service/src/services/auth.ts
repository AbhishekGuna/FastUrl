import { betterAuth } from 'better-auth';
import { bearer, haveIBeenPwned } from 'better-auth/plugins';
import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { redis } from '../redis/client.js';
import { sendVerificationEmail } from '../utils/mailer.js';

export const auth = betterAuth({
    database: pool,
    baseURL: config.authUrl,
    trustedOrigins: config.corsOrigins,
    secret: config.authSecret,

    // ── 1: Email & Password with length enforcement ────────────────────────────
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        maxPasswordLength: 64,
    },

    // ── 1: Email Verification ─────────────────────────────────────────────────
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
            await sendVerificationEmail(user.email, url);
        },
    },

    // ── 3: Redis-backed secondary storage (rate limits survive restarts) ──────
    secondaryStorage: {
        get: async (key) => {
            const val = await redis.get(key);
            return val ?? null;
        },
        // Atomically get-then-delete (used by one-time tokens)
        getAndDelete: async (key) => {
            const [val] = (await redis.pipeline().get(key).del(key).exec()) ?? [];
            return (val?.[1] as string | null) ?? null;
        },
        // Atomic increment with TTL on creation (rate-limit counter)
        increment: async (key, ttl) => {
            const pipeline = redis.pipeline().incr(key).expire(key, ttl, 'NX');
            const results = await pipeline.exec();
            return (results?.[0]?.[1] as number) ?? 1;
        },
        set: async (key, value, ttl) => {
            if (ttl) {
                await redis.set(key, value, 'EX', ttl);
            } else {
                await redis.set(key, value);
            }
        },
        delete: async (key) => {
            await redis.del(key);
        },
    },

    // ── 3: Built-in rate limiting (stricter on auth endpoints) ────────────────
    rateLimit: {
        window: 60, // 1 minute
        max: 100, // generous default; /sign-in/email has its own 3/10s rule
    },

    // ── 4: Session with sliding expiry + cookie cache (avoids DB on each req) ─
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // extend on every day of activity
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5, // 5-minute short-circuit cache
        },
    },

    plugins: [
        bearer(),
        // ── 2: HIBP pwned-password check (k-anonymity, production only) ──────
        haveIBeenPwned({
            enabled: process.env.NODE_ENV === 'production',
            customPasswordCompromisedMessage:
                'This password has appeared in a data breach. Please choose a different password.',
        }),
    ],
});

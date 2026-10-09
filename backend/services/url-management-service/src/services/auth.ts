import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { redis } from '../redis/client.js';
import { sendVerificationEmail } from '../utils/mailer.js';

const AUTH_KEY_PREFIX = 'auth:';
const authKey = (key: string) => `${AUTH_KEY_PREFIX}${key}`;

export const auth = betterAuth({
    database: pool,
    baseURL: config.authUrl,
    trustedOrigins: config.corsOrigins,
    secret: config.authSecret,

    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        maxPasswordLength: 64,
        requireEmailVerification: true,
    },

    emailVerification: {
        sendOnSignUp: true,
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
        expiresIn: 5 * 60,
        redirectTo: config.frontendUrl,
        sendVerificationEmail: async ({ user, url }) => {
            void sendVerificationEmail(user.email, url).catch((e) => console.error(e));
        },
    },

    secondaryStorage: {
        get: async (key) => (await redis.get(authKey(key))) ?? null,

        getAndDelete: async (key) => {
            return await redis.getdel(authKey(key));
        },

        increment: async (key, ttl) => {
            const k = authKey(key);
            const count = await redis.incr(k);
            await redis.expire(k, ttl, 'NX');
            return count;
        },

        set: async (key, value, ttl) => {
            if (ttl) await redis.set(authKey(key), value, 'EX', ttl);
            else await redis.set(authKey(key), value);
        },

        delete: async (key) => {
            await redis.del(authKey(key));
        },
    },

    rateLimit: {
        enabled: true,
        storage: 'secondary-storage',
        window: 60,
        max: 100,
        customRules: {
            '/sign-in/email': { window: 60, max: 5 },
            '/sign-up/email': { window: 60, max: 3 },
            '/forget-password': { window: 300, max: 3 },
            '/send-verification-email': { window: 300, max: 3 },
        },
    },

    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // extend on every day of activity
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5, // 5-minute short-circuit cache
        },
    },

    plugins: [bearer()],
});

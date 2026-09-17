import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { config } from '../config.js';
import { pool } from '../db/pool.js';

export const auth = betterAuth({
    database: pool,
    baseURL: config.authUrl,
    trustedOrigins: config.corsOrigins,
    secret: config.authSecret,
    emailAndPassword: {
        enabled: true,
    },
    plugins: [bearer()],
});

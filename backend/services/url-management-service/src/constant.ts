export const URL_CACHE_TTL_SECONDS = 3600;

export const CREATE_URL_RATE_LIMIT = { max: 30, windowSeconds: 60 };

export const DOMAIN_ERROR_STATUS: Record<string, number> = {
    INVALID_DESTINATION: 400,
    UNSUPPORTED_PROTOCOL: 400,
    INVALID_ALIAS: 400,
    ALIAS_TAKEN: 409,
    SHORT_CODE_GENERATION_FAILED: 503,
};

export const RANGE_CONFIG: Record<string, { interval: string; trunc: string }> = {
    '24h': { interval: '24 hours', trunc: 'hour' },
    '7d': { interval: '7 days', trunc: 'day' },
    '30d': { interval: '30 days', trunc: 'day' },
};

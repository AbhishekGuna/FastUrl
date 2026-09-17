import { describe, expect, it } from 'vitest';
import type { Cache, NewUrl, UpdateUrlPatch, Url, UrlRepository } from '../types.js';
import { CreateUrl } from './CreateUrl.js';

function makeRepository(existing: Set<string> = new Set()): UrlRepository {
    const store = new Map<string, Url>();
    return {
        async create(input: NewUrl): Promise<Url> {
            const url: Url = {
                id: '1',
                shortCode: input.shortCode,
                userId: input.userId,
                destination: input.destination,
                status: 'ACTIVE',
                redirectType: input.redirectType,
                createdAt: new Date().toISOString(),
                expiresAt: input.expiresAt ?? null,
                clickCount: 0,
            };
            store.set(input.shortCode, url);
            return url;
        },
        async findByShortCode(shortCode: string) {
            return store.get(shortCode) ?? null;
        },
        async findByUser() {
            return [];
        },
        async update(shortCode: string, _userId: string, _patch: UpdateUrlPatch) {
            return store.get(shortCode) ?? null;
        },
        async existsByShortCode(shortCode: string) {
            return existing.has(shortCode) || store.has(shortCode);
        },
    };
}

function makeCache(): Cache & { store: Map<string, unknown> } {
    const store = new Map<string, unknown>();
    return {
        store,
        async get<T>(key: string) {
            return (store.get(key) as T) ?? null;
        },
        async set(key, value) {
            store.set(key, value);
        },
        async delete(key) {
            store.delete(key);
        },
    };
}

describe('CreateUrl', () => {
    it('creates a URL and populates the cache', async () => {
        const repository = makeRepository();
        const cache = makeCache();
        const createUrl = new CreateUrl(repository, cache);

        const url = await createUrl.execute({
            userId: 'user-1',
            destination: 'https://example.com',
        });

        expect(url.destination).toBe('https://example.com');
        expect(url.shortCode).toMatch(/^[0-9A-Za-z]+$/);
        expect(cache.store.get(`url:${url.shortCode}`)).toEqual(url);
    });

    it('rejects a malformed destination', async () => {
        const createUrl = new CreateUrl(makeRepository(), makeCache());
        await expect(
            createUrl.execute({ userId: 'user-1', destination: 'not-a-url' }),
        ).rejects.toThrow('INVALID_DESTINATION');
    });

    it('rejects a non-http(s) destination', async () => {
        const createUrl = new CreateUrl(makeRepository(), makeCache());
        await expect(
            createUrl.execute({ userId: 'user-1', destination: 'ftp://example.com/file' }),
        ).rejects.toThrow('UNSUPPORTED_PROTOCOL');
    });

    it('uses a custom alias when available', async () => {
        const createUrl = new CreateUrl(makeRepository(), makeCache());
        const url = await createUrl.execute({
            userId: 'user-1',
            destination: 'https://example.com',
            customAlias: 'my-link',
        });
        expect(url.shortCode).toBe('my-link');
    });

    it("rejects a custom alias that's already taken", async () => {
        const createUrl = new CreateUrl(makeRepository(new Set(['taken'])), makeCache());
        await expect(
            createUrl.execute({
                userId: 'user-1',
                destination: 'https://example.com',
                customAlias: 'taken',
            }),
        ).rejects.toThrow('ALIAS_TAKEN');
    });

    it('rejects a custom alias with invalid characters', async () => {
        const createUrl = new CreateUrl(makeRepository(), makeCache());
        await expect(
            createUrl.execute({
                userId: 'user-1',
                destination: 'https://example.com',
                customAlias: 'not valid!',
            }),
        ).rejects.toThrow('INVALID_ALIAS');
    });
});

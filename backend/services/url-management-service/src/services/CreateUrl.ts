import { randomBytes } from 'node:crypto';
import type { Cache, RedirectType, Url, UrlRepository } from '../types.js';
import { base62Encode } from '../utils/base62.js';
import { validateDestination } from '../utils/validateDestination.js';

export interface CreateUrlInput {
    userId: string;
    destination: string;
    customAlias?: string;
    redirectType?: RedirectType;
    expiresAt?: string | null;
}

const URL_CACHE_TTL_SECONDS = 3600;
const CUSTOM_ALIAS_PATTERN = /^[A-Za-z0-9_-]{1,16}$/;

export class CreateUrl {
    constructor(
        private readonly repository: UrlRepository,
        private readonly cache: Cache,
    ) {}

    async execute(input: CreateUrlInput): Promise<Url> {
        validateDestination(input.destination);

        const shortCode = input.customAlias
            ? await this.reserveCustomAlias(input.customAlias)
            : await this.generateUniqueShortCode();

        const url = await this.repository.create({
            shortCode,
            userId: input.userId,
            destination: input.destination,
            redirectType: input.redirectType ?? 302,
            expiresAt: input.expiresAt ?? null,
        });

        await this.cache.set(`url:${shortCode}`, url, URL_CACHE_TTL_SECONDS);
        return url;
    }

    private async reserveCustomAlias(alias: string): Promise<string> {
        if (!CUSTOM_ALIAS_PATTERN.test(alias)) {
            throw new Error('INVALID_ALIAS');
        }
        if (await this.repository.existsByShortCode(alias)) {
            throw new Error('ALIAS_TAKEN');
        }
        return alias;
    }

    private async generateUniqueShortCode(): Promise<string> {
        for (let attempt = 0; attempt < 5; attempt++) {
            const candidate = base62Encode(BigInt(randomBytes(6).readUIntBE(0, 6)));
            if (!(await this.repository.existsByShortCode(candidate))) return candidate;
        }
        throw new Error('SHORT_CODE_GENERATION_FAILED');
    }
}

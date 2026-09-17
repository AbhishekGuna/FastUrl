export type UrlStatus = 'ACTIVE' | 'DISABLED';

// 301 = immutable, cache aggressively. 302/307 = destination or analytics
export type RedirectType = 301 | 302 | 307 | 308;

export interface Url {
    id: string;
    shortCode: string;
    userId: string;
    destination: string;
    status: UrlStatus;
    redirectType: RedirectType;
    createdAt: string;
    expiresAt?: string | null;
    clickCount: number;
}

export interface Cache {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
    delete(key: string): Promise<void>;
}


export interface NewUrl {
    shortCode: string;
    userId: string;
    destination: string;
    redirectType: RedirectType;
    expiresAt?: string | null;
}

export interface UpdateUrlPatch {
    destination?: string;
    status?: UrlStatus;
    expiresAt?: string | null;
}

export interface UrlRepository {
    create(input: NewUrl): Promise<Url>;
    findByShortCode(shortCode: string): Promise<Url | null>;
    findByUser(userId: string, limit: number, offset: number): Promise<Url[]>;
    update(shortCode: string, userId: string, patch: UpdateUrlPatch): Promise<Url | null>;
    existsByShortCode(shortCode: string): Promise<boolean>;
}


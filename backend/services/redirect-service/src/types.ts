type UrlStatus = 'ACTIVE' | 'DISABLED';

type RedirectType = 301 | 302 | 307 | 308;

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
}

export interface RawClickEvent {
    shortCode: string;
    timestamp: string; // ISO 8601
    ip: string;
    userAgent: string;
    referrer: string;
}

export interface EventPublisher {
    publishClick(event: RawClickEvent): Promise<void>;
}

export interface UrlRepository {
    findByShortCode(shortCode: string): Promise<Url | null>;
}

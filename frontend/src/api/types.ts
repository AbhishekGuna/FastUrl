export type UrlStatus = 'ACTIVE' | 'DISABLED';

export interface ShortUrl {
    id: string;
    shortCode: string;
    userId: string;
    destination: string;
    status: UrlStatus;
    redirectType: 301 | 302 | 307 | 308;
    createdAt: string;
    expiresAt?: string | null;
    clickCount: number;
}

export interface CreateUrlResponse {
    shortCode: string;
    shortUrl: string;
    destination: string;
    expiresAt?: string | null;
}

export interface AuthUser {
    id: string;
    email: string;
    name: string;
}

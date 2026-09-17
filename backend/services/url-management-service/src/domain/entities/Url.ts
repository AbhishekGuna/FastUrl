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

import type { RedirectType, Url, UrlStatus } from "../entities/Url.js";

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

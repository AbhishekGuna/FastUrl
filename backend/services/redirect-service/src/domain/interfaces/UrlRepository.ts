import type { Url } from "../entities/Url.js";

export interface UrlRepository {
  findByShortCode(shortCode: string): Promise<Url | null>;
}

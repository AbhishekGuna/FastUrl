import type { Url } from "../domain/entities/Url.js";
import type { Cache } from "../domain/interfaces/Cache.js";
import type { UrlRepository } from "../domain/interfaces/UrlRepository.js";
import { config } from "../config/index.js";

export type ResolveResult =
  | { outcome: "found"; url: Url }
  | { outcome: "not_found" }
  | { outcome: "expired" };

export class ResolveShortCode {
  constructor(
    private readonly cache: Cache,
    private readonly repository: UrlRepository
  ) {}

  async execute(shortCode: string): Promise<ResolveResult> {
    const cacheKey = `url:${shortCode}`;
    let url = await this.cache.get<Url>(cacheKey);

    if (!url) {
      url = await this.repository.findByShortCode(shortCode);
      if (!url) return { outcome: "not_found" };
      await this.cache.set(cacheKey, url, config.urlCacheTtlSeconds);
    }

    if (url.status !== "ACTIVE") return { outcome: "not_found" };
    if (url.expiresAt && new Date(url.expiresAt).getTime() < Date.now()) {
      return { outcome: "expired" };
    }

    return { outcome: "found", url };
  }
}

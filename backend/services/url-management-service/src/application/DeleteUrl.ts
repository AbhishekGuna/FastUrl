import type { UrlRepository } from "../domain/interfaces/UrlRepository.js";
import type { Cache } from "../domain/interfaces/Cache.js";

export class DeleteUrl {
  constructor(
    private readonly repository: UrlRepository,
    private readonly cache: Cache
  ) {}

  // Soft delete — mark inactive rather than a hard DELETE, so an old
  // link resolves to a clear "gone" instead of vanishing without a trace.
  async execute(shortCode: string, userId: string): Promise<boolean> {
    const url = await this.repository.update(shortCode, userId, { status: "DISABLED" });
    if (!url) return false;

    await this.cache.delete(`url:${shortCode}`);
    return true;
  }
}

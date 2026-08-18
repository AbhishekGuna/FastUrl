import type { Url } from "../domain/entities/Url.js";
import type { UpdateUrlPatch, UrlRepository } from "../domain/interfaces/UrlRepository.js";
import type { Cache } from "../domain/interfaces/Cache.js";
import { validateDestination } from "../domain/services/validateDestination.js";

export class UpdateUrl {
  constructor(
    private readonly repository: UrlRepository,
    private readonly cache: Cache
  ) {}

  async execute(shortCode: string, userId: string, patch: UpdateUrlPatch): Promise<Url | null> {
    if (patch.destination !== undefined) validateDestination(patch.destination);

    const url = await this.repository.update(shortCode, userId, patch);
    if (!url) return null;

    await this.cache.delete(`url:${shortCode}`);
    return url;
  }
}

import type { Url } from '../domain/entities/Url.js';
import type { UrlRepository } from '../domain/interfaces/UrlRepository.js';

export class GetUrl {
    constructor(private readonly repository: UrlRepository) {}

    async execute(shortCode: string, userId: string): Promise<Url | null> {
        const url = await this.repository.findByShortCode(shortCode);
        if (!url || url.userId !== userId) return null;
        return url;
    }
}

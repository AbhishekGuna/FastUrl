import type { Url, UrlRepository } from '../types.js';

export class ListUrls {
    constructor(private readonly repository: UrlRepository) {}

    async execute(userId: string, limit = 20, offset = 0): Promise<Url[]> {
        return this.repository.findByUser(userId, limit, offset);
    }
}

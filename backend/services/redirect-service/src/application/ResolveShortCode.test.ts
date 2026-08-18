import { describe, expect, it } from "vitest";
import { ResolveShortCode } from "./ResolveShortCode.js";
import type { UrlRepository } from "../domain/interfaces/UrlRepository.js";
import type { Cache } from "../domain/interfaces/Cache.js";
import type { Url } from "../domain/entities/Url.js";

function makeUrl(overrides: Partial<Url> = {}): Url {
  return {
    id: "1",
    shortCode: "abc123",
    userId: "user-1",
    destination: "https://example.com",
    status: "ACTIVE",
    redirectType: 302,
    createdAt: new Date().toISOString(),
    expiresAt: null,
    clickCount: 0,
    ...overrides,
  };
}

function makeRepository(store: Map<string, Url>): UrlRepository {
  return {
    async findByShortCode(shortCode: string) {
      return store.get(shortCode) ?? null;
    },
  };
}

function makeCache(): Cache & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    store,
    async get<T>(key: string) {
      return (store.get(key) as T) ?? null;
    },
    async set(key, value) {
      store.set(key, value);
    },
  };
}

describe("ResolveShortCode", () => {
  it("returns not_found for an unknown short code", async () => {
    const resolve = new ResolveShortCode(makeCache(), makeRepository(new Map()));
    const result = await resolve.execute("missing");
    expect(result.outcome).toBe("not_found");
  });

  it("resolves from the repository and populates the cache on a miss", async () => {
    const url = makeUrl();
    const repository = makeRepository(new Map([[url.shortCode, url]]));
    const cache = makeCache();
    const resolve = new ResolveShortCode(cache, repository);

    const result = await resolve.execute(url.shortCode);

    expect(result).toEqual({ outcome: "found", url });
    expect(cache.store.get(`url:${url.shortCode}`)).toEqual(url);
  });

  it("resolves from the cache without hitting the repository", async () => {
    const url = makeUrl();
    const repository = makeRepository(new Map()); // empty: would 404 if hit
    const cache = makeCache();
    cache.store.set(`url:${url.shortCode}`, url);
    const resolve = new ResolveShortCode(cache, repository);

    const result = await resolve.execute(url.shortCode);

    expect(result).toEqual({ outcome: "found", url });
  });

  it("treats a disabled URL as not_found", async () => {
    const url = makeUrl({ status: "DISABLED" });
    const repository = makeRepository(new Map([[url.shortCode, url]]));
    const resolve = new ResolveShortCode(makeCache(), repository);

    const result = await resolve.execute(url.shortCode);

    expect(result.outcome).toBe("not_found");
  });

  it("returns expired for a URL past its expiresAt", async () => {
    const url = makeUrl({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    const repository = makeRepository(new Map([[url.shortCode, url]]));
    const resolve = new ResolveShortCode(makeCache(), repository);

    const result = await resolve.execute(url.shortCode);

    expect(result.outcome).toBe("expired");
  });
});

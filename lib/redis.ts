import { Redis } from "@upstash/redis";
import { hasRedis } from "@/lib/config";

// In-memory fallback so caching code paths work without Upstash configured.
class MemoryCache {
  private store = new Map<string, { value: unknown; expires: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expires && entry.expires < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<void> {
    this.store.set(key, {
      value,
      expires: opts?.ex ? Date.now() + opts.ex * 1000 : 0,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const next = current + 1;
    await this.set(key, next);
    return next;
  }
}

type CacheLike = Pick<Redis, "get" | "set" | "del" | "incr">;

export const redis: CacheLike = hasRedis
  ? Redis.fromEnv()
  : (new MemoryCache() as unknown as CacheLike);

/** Cache-aside helper. */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>
): Promise<T> {
  const hit = await redis.get<T>(key);
  if (hit !== null && hit !== undefined) return hit;
  const value = await producer();
  await redis.set(key, value as unknown as string, { ex: ttlSeconds });
  return value;
}

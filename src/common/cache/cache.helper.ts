import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

interface CacheOptions {
  ttl?: number; // Time-to-live in seconds
  keyPrefix?: string; // Prefix for cache keys (e.g., 'event:', 'wallet:')
}

@Injectable()
export class CacheHelper {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get value from cache or fetch from source if not cached
   * @param key Cache key (e.g., 'event:123')
   * @param fetchFn Function to fetch data if cache miss
   * @param options Cache options (TTL, prefix)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const prefixedKey = options.keyPrefix ? `${options.keyPrefix}${key}` : key;

    // Try to get from cache
    const cached = await this.cacheManager.get<T>(prefixedKey);
    if (cached !== undefined) return cached;

    // Cache miss: fetch from source
    const data = await fetchFn();

    // Store in cache with TTL (works for in-memory and Redis)
    // If your cache-manager version expects a number, this works too
    await this.cacheManager.set(prefixedKey, data, options.ttl ?? 3600);

    return data;
  }

  /**
   * Invalidate cache by key or prefix
   * @param keyOrPrefix Key or prefix to invalidate
   */
  async invalidate(keyOrPrefix: string): Promise<void> {
    await this.cacheManager.del(keyOrPrefix);
  }

  /**
   * Get raw cache value (useful for debugging or direct access)
   * @param key Cache key
   * @param prefix Optional prefix
   */
  async get<T>(key: string, prefix?: string): Promise<T | undefined> {
    const prefixedKey = prefix ? `${prefix}${key}` : key;
    return this.cacheManager.get<T>(prefixedKey);
  }

  /**
   * Set raw cache value
   * @param key Cache key
   * @param value Value to cache
   * @param options Cache options (TTL, prefix)
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<void> {
    const prefixedKey = options.keyPrefix ? `${options.keyPrefix}${key}` : key;
    await this.cacheManager.set(prefixedKey, value, options.ttl ?? 3600);
  }
}

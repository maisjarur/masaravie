import { Injectable } from '@nestjs/common';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CACHE_MAX_ENTRIES = 200;

interface CacheEntry {
  payload: any;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly _store = new Map<string, CacheEntry>();

  get(key: string): any | null {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return null;
    }
    return entry.payload;
  }

  set(key: string, payload: any): void {
    // Evict oldest entry beyond max size to prevent unbounded growth
    if (this._store.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = this._store.keys().next().value;
      if (oldestKey) this._store.delete(oldestKey);
    }
    this._store.set(key, { payload, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  buildKey(location: string, onlineOnly: boolean, services: string[]): string {
    return `${location.toLowerCase()}|${onlineOnly}|${[...services].sort().join(',')}`;
  }
}

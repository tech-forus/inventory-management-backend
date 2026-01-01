import type { AxiosRequestConfig } from 'axios';
import api from './api';
import { cacheGet, cacheSet, cacheRemove, cacheRemoveByPrefix } from './localCache';

type CacheOptions = {
  ttlMs?: number;
  key?: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && (value as any).constructor === Object;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((value as any)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function buildCacheKey(url: string, config?: AxiosRequestConfig): string {
  const params = (config as any)?.params;
  return `GET:${url}?params=${stableStringify(params ?? null)}`;
}

export async function cachedGet<T = any>(
  url: string,
  config?: AxiosRequestConfig,
  options?: CacheOptions
): Promise<T> {
  const ttlMs = options?.ttlMs ?? 2 * 60 * 1000; // default 2 minutes
  const key = options?.key ?? buildCacheKey(url, config);

  const cached = cacheGet<T>(key);
  if (cached !== null) return cached;

  const response = await api.get(url, config);
  cacheSet(key, response.data as T, ttlMs);
  return response.data as T;
}

export function invalidateCacheKey(key: string): void {
  cacheRemove(key);
}

export function invalidateCachePrefix(prefix: string): void {
  cacheRemoveByPrefix(prefix);
}




type CacheEnvelope<T> = {
  v: T;
  e: number; // expiresAt epoch ms
};

const CACHE_PREFIX = 'nexusinv:cache:';

function nowMs() {
  return Date.now();
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getUserNamespace(): string {
  const rawUser = localStorage.getItem('user') || sessionStorage.getItem('user');
  const user = rawUser ? safeJsonParse<any>(rawUser) : null;
  const companyId = user?.companyId ? String(user.companyId) : 'unknownCompany';
  const email = user?.email ? String(user.email) : 'unknownUser';
  return `${companyId}:${email}`;
}

function fullKey(key: string): string {
  return `${CACHE_PREFIX}${getUserNamespace()}:${key}`;
}

export function cacheGet<T>(key: string): T | null {
  const raw = localStorage.getItem(fullKey(key));
  if (!raw) return null;
  const env = safeJsonParse<CacheEnvelope<T>>(raw);
  if (!env || typeof env.e !== 'number') {
    localStorage.removeItem(fullKey(key));
    return null;
  }
  if (env.e <= nowMs()) {
    localStorage.removeItem(fullKey(key));
    return null;
  }
  return env.v ?? null;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  const env: CacheEnvelope<T> = { v: value, e: nowMs() + ttlMs };
  try {
    localStorage.setItem(fullKey(key), JSON.stringify(env));
  } catch {
    // Storage might be full or blocked; fail open.
  }
}

export function cacheRemove(key: string): void {
  localStorage.removeItem(fullKey(key));
}

export function cacheRemoveByPrefix(prefix: string): void {
  const nsPrefix = `${CACHE_PREFIX}${getUserNamespace()}:${prefix}`;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(nsPrefix)) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    // ignore
  }
}




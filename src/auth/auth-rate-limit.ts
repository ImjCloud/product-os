/**
 * Lightweight per-process guard for public authentication endpoints.
 * Production deployments with multiple API replicas should additionally enforce
 * distributed limits at the gateway/WAF (this in-memory counter is not shared).
 */
type WindowEntry = { count: number; resetAt: number };
type RequestLike = { method?: string; path?: string; originalUrl?: string; ip?: string; socket?: { remoteAddress?: string } };
type ResponseLike = { setHeader(name: string, value: string): void; status(code: number): ResponseLike; json(body: unknown): void };

export class AuthRateLimiter {
  private readonly windows = new Map<string, WindowEntry>();
  private operations = 0;
  private readonly maxEntries = 10_000;

  handle(req: RequestLike, res: ResponseLike, next: () => void, now = Date.now()): void {
    const method = (req.method || 'GET').toUpperCase();
    const path = (req.path || req.originalUrl || '').split('?')[0].replace(/^\/api(?=\/)/, '');
    if (method !== 'POST') return next();

    const policy = path === '/auth/login' ? { limit: 10, windowMs: 15 * 60_000 }
      : path === '/auth/register' ? { limit: 5, windowMs: 60 * 60_000 }
      : path === '/auth/login/microsoft' ? { limit: 10, windowMs: 15 * 60_000 }
      : path === '/auth/link/microsoft' ? { limit: 10, windowMs: 15 * 60_000 }
      : null;
    if (!policy) return next();

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${ip}:${path}`;
    let entry = this.windows.get(key);
    if (!entry || entry.resetAt <= now) {
      // Keep attacker-controlled client-address cardinality from growing the map forever.
      if (this.windows.size >= this.maxEntries) this.prune(now, true);
      entry = { count: 0, resetAt: now + policy.windowMs };
      this.windows.set(key, entry);
    }
    entry.count += 1;
    const remaining = Math.max(0, policy.limit - entry.count);
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader('RateLimit-Limit', String(policy.limit));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > policy.limit) {
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ statusCode: 429, message: 'Too many authentication attempts. Please wait before trying again.' });
      return;
    }

    // Bound stale entries without creating a timer that keeps the process alive.
    this.operations += 1;
    if (this.operations % 256 === 0) this.prune(now);
    next();
  }

  private prune(now: number, enforceCapacity = false): void {
    for (const [entryKey, value] of this.windows) {
      if (value.resetAt <= now || (enforceCapacity && this.windows.size >= this.maxEntries)) this.windows.delete(entryKey);
    }
    // If all entries are still active, discard the oldest insertion-order entries.
    while (enforceCapacity && this.windows.size >= this.maxEntries) {
      const oldest = this.windows.keys().next().value as string | undefined;
      if (!oldest) break;
      this.windows.delete(oldest);
    }
  }
}

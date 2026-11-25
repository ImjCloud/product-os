import { AuthRateLimiter } from './auth-rate-limit';

describe('AuthRateLimiter', () => {
  function response() {
    const headers: Record<string, string> = {};
    let code = 200;
    let body: unknown;
    return {
      headers,
      get statusCode() { return code; },
      get body() { return body; },
      setHeader(name: string, value: string) { headers[name] = value; },
      status(value: number) { code = value; return this; },
      json(value: unknown) { body = value; },
    };
  }

  it('allows requests within the login window and rejects the next attempt', () => {
    const limiter = new AuthRateLimiter();
    let nextCount = 0;
    let last: ReturnType<typeof response> | undefined;
    for (let i = 0; i < 11; i += 1) {
      last = response();
      limiter.handle({ method: 'POST', path: '/api/auth/login', ip: '127.0.0.1' }, last, () => { nextCount += 1; }, 1_000);
    }
    expect(nextCount).toBe(10);
    expect(last?.statusCode).toBe(429);
    expect(last?.headers['Retry-After']).toBeDefined();
  });

  it('does not throttle unrelated endpoints or non-POST requests', () => {
    const limiter = new AuthRateLimiter();
    const unrelated = response();
    const read = response();
    let nextCount = 0;
    limiter.handle({ method: 'POST', path: '/api/requirements', ip: '127.0.0.1' }, unrelated, () => { nextCount += 1; }, 1_000);
    limiter.handle({ method: 'GET', path: '/api/auth/login', ip: '127.0.0.1' }, read, () => { nextCount += 1; }, 1_000);
    expect(nextCount).toBe(2);
    expect(unrelated.statusCode).toBe(200);
    expect(read.statusCode).toBe(200);
  });

  it('keeps separate limits for different client addresses', () => {
    const limiter = new AuthRateLimiter();
    let nextCount = 0;
    for (let i = 0; i < 10; i += 1) limiter.handle({ method: 'POST', path: '/api/auth/login', ip: 'one' }, response(), () => { nextCount += 1; }, 1_000);
    const secondClient = response();
    limiter.handle({ method: 'POST', path: '/api/auth/login', ip: 'two' }, secondClient, () => { nextCount += 1; }, 1_000);
    expect(nextCount).toBe(11);
    expect(secondClient.statusCode).toBe(200);
  });
});

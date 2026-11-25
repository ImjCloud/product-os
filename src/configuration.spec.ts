import { validateRuntimeConfiguration } from './configuration';

describe('validateRuntimeConfiguration', () => {
  const valid = { JWT_SECRET: 'a'.repeat(48), DATABASE_URL: 'postgresql://user:pass@localhost:5432/product_os', CORS_ORIGINS: 'http://localhost:3001', NODE_ENV: 'development' };

  it('accepts a configured local environment', () => {
    expect(() => validateRuntimeConfiguration(valid)).not.toThrow();
  });

  it('rejects missing or placeholder JWT secrets and missing database URLs', () => {
    expect(() => validateRuntimeConfiguration({ ...valid, JWT_SECRET: 'replace-with-a-random-secret-at-least-32-characters' })).toThrow(/JWT_SECRET/);
    expect(() => validateRuntimeConfiguration({ ...valid, DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
  });

  it('rejects wildcard CORS and non-HTTPS production origins', () => {
    expect(() => validateRuntimeConfiguration({ ...valid, CORS_ORIGINS: '*' })).toThrow(/CORS_ORIGINS/);
    expect(() => validateRuntimeConfiguration({ ...valid, NODE_ENV: 'production', CORS_ORIGINS: 'http://app.example.com' })).toThrow(/HTTPS/);
  });
});

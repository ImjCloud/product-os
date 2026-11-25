/** Fail-fast validation for configuration required to run the API safely. */
export function validateRuntimeConfiguration(env: NodeJS.ProcessEnv = process.env): void {
  const errors: string[] = [];
  const secret = env.JWT_SECRET || '';
  if (secret.length < 32 || /change-this|replace-with|your-secret/i.test(secret)) {
    errors.push('JWT_SECRET must be a unique random value containing at least 32 characters.');
  }
  if (!env.DATABASE_URL?.trim()) errors.push('DATABASE_URL must be configured.');
  const origins = (env.CORS_ORIGINS || 'http://localhost:3001').split(',').map(value => value.trim()).filter(Boolean);
  if (!origins.length || origins.some(origin => origin === '*' || !/^https?:\/\//i.test(origin))) {
    errors.push('CORS_ORIGINS must contain explicit http(s) origins; wildcard origins are not allowed.');
  }
  if ((env.NODE_ENV || 'development') === 'production' && origins.some(origin => origin.startsWith('http://') && !/^http:\/\/localhost(?::\d+)?$/i.test(origin))) {
    errors.push('Production CORS origins must use HTTPS (except localhost for controlled local deployments).');
  }
  if (errors.length) throw new Error(`Invalid Product OS configuration:\n- ${errors.join('\n- ')}`);
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual, scrypt as scryptCallback, randomBytes, createPublicKey, verify as verifySignature } from 'crypto';
import { promisify } from 'util';
const scrypt = promisify(scryptCallback);
type Claims = { sub: string; email?: string; name?: string; iss?: string; aud?: string | string[]; exp?: number; iat?: number; tid?: string; oid?: string; preferred_username?: string; [key: string]: unknown };
@Injectable()
export class TokenService {
  private entraJwks: { keys: any[]; expiresAt: number } | null = null;
  private entraJwksRequest: Promise<any[]> | null = null;
  private secret() { const value = process.env.JWT_SECRET; if (!value || value.length < 32) throw new Error('JWT_SECRET must be set to at least 32 characters.'); return value; }
  async hashPassword(password: string): Promise<string> { const salt = randomBytes(16); const key = await scrypt(password, salt, 64) as Buffer; return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`; }
  async verifyPassword(password: string, stored: string): Promise<boolean> { const [scheme, saltHex, keyHex] = stored.split('$'); if (scheme !== 'scrypt' || !saltHex || !keyHex) return false; const expected = Buffer.from(keyHex, 'hex'); const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length) as Buffer; return actual.length === expected.length && timingSafeEqual(actual, expected); }
  signLocal(user: { id: string; email: string; name?: string | null }): string { const now = Math.floor(Date.now() / 1000); const header = this.b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' })); const payload = this.b64(JSON.stringify({ sub: user.id, email: user.email, name: user.name, iss: 'product-os', aud: 'product-os-api', iat: now, exp: now + 3600 })); const input = `${header}.${payload}`; return `${input}.${createHmac('sha256', this.secret()).update(input).digest('base64url')}`; }
  async verify(token: string): Promise<Claims> { const parts = token.split('.'); if (parts.length !== 3) throw new UnauthorizedException('Invalid bearer token.'); let header: any; let claims: Claims; try { header = JSON.parse(Buffer.from(parts[0], 'base64url').toString()); claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString()); } catch { throw new UnauthorizedException('Malformed bearer token.'); }
    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.exp !== 'number' || claims.exp <= now || typeof claims.sub !== 'string' || !claims.sub || (typeof claims.nbf === 'number' && claims.nbf > now) || (typeof claims.iat === 'number' && claims.iat > now + 60)) throw new UnauthorizedException('Bearer token is expired or missing required claims.');
    if (header.alg === 'HS256' && claims.iss === 'product-os' && claims.aud === 'product-os-api') { const input = `${parts[0]}.${parts[1]}`; const expected = createHmac('sha256', this.secret()).update(input).digest(); const actual = Buffer.from(parts[2], 'base64url'); if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new UnauthorizedException('Invalid bearer token signature.'); return claims; }
    return this.verifyEntra(parts, header, claims);
  }
  private async verifyEntra(parts: string[], header: any, claims: Claims): Promise<Claims> { const tenant = process.env.ENTRA_TENANT_ID; const clientId = process.env.ENTRA_CLIENT_ID; if (!tenant || !clientId || header.alg !== 'RS256' || claims.tid !== tenant || claims.aud !== clientId || claims.iss !== `https://login.microsoftonline.com/${tenant}/v2.0` || !header.kid) throw new UnauthorizedException('Token is not a valid Product OS or configured Microsoft Entra token.');
    try {
      let keys = await this.getEntraSigningKeys(tenant);
      let jwk = keys.find((key: any) => key.kid === header.kid && key.kty === 'RSA' && key.use !== 'enc');
      // A newly rotated Microsoft key may not exist in the current cache.
      if (!jwk) {
        keys = await this.getEntraSigningKeys(tenant, true);
        jwk = keys.find((key: any) => key.kid === header.kid && key.kty === 'RSA' && key.use !== 'enc');
      }
      if (!jwk) throw new Error('Signing key not found.');
      const key = createPublicKey({ key: jwk, format: 'jwk' });
      const input = `${parts[0]}.${parts[1]}`;
      const valid = verifySignature('RSA-SHA256', Buffer.from(input), key, Buffer.from(parts[2], 'base64url'));
      if (!valid) throw new Error('Invalid signature.');
      return claims;
    } catch { throw new UnauthorizedException('Microsoft Entra token validation failed.'); }
  }
  private async getEntraSigningKeys(tenant: string, forceRefresh = false): Promise<any[]> {
    const now = Date.now();
    if (!forceRefresh && this.entraJwks && this.entraJwks.expiresAt > now) return this.entraJwks.keys;
    if (!forceRefresh && this.entraJwksRequest) return this.entraJwksRequest;
    this.entraJwksRequest = (async () => {
      const response = await fetch(`https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Unable to retrieve Microsoft signing keys.');
      const jwks: any = await response.json();
      if (!Array.isArray(jwks.keys) || !jwks.keys.length) throw new Error('Microsoft signing keys are unavailable.');
      this.entraJwks = { keys: jwks.keys, expiresAt: Date.now() + 60 * 60_000 };
      return jwks.keys;
    })();
    try { return await this.entraJwksRequest; }
    finally { this.entraJwksRequest = null; }
  }
  private b64(value: string) { return Buffer.from(value).toString('base64url'); }
}

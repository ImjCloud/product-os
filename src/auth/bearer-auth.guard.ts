import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TokenService } from './token.service';
import { AuthenticatedRequest } from './organisation.guard';
@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(private tokens: TokenService, private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> { const req = context.switchToHttp().getRequest<AuthenticatedRequest>(); const header = req.headers.authorization; const value = Array.isArray(header) ? header[0] : header; if (!value?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer authentication is required.'); const claims = await this.tokens.verify(value.slice(7)); let userId = claims.sub;
    if (claims.iss !== 'product-os') { const entraObjectId = String(claims.oid || ''); const email = String(claims.preferred_username || claims.email || '').toLowerCase(); if (!entraObjectId || !email) throw new UnauthorizedException('Microsoft identity is missing required claims.'); let user = await this.prisma.user.findUnique({ where: { entraObjectId } }); if (user && user.entraTenantId !== String(claims.tid)) throw new UnauthorizedException('Microsoft identity belongs to a different tenant.'); if (!user) { const byEmail = await this.prisma.user.findUnique({ where: { email } }); if (byEmail) throw new UnauthorizedException('An account already uses this email. Sign in with that account and explicitly link Microsoft sign-in first.'); else { user = await this.prisma.user.create({ data: { entraObjectId, entraTenantId: String(claims.tid), email, name: typeof claims.name === 'string' ? claims.name : undefined } }); } } userId = user.id; }
    else { const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } }); if (!user) throw new UnauthorizedException('Account no longer exists.'); }
    req.user = { sub: userId }; return true;
  }
}

import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TokenService } from './token.service';
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private tokens: TokenService) {}
  async register(input: { email: string; password: string; name?: string }) { const email = input.email.trim().toLowerCase(); if (input.password.length < 12) throw new BadRequestException('Password must contain at least 12 characters.'); if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('An account with this email already exists.'); const user = await this.prisma.user.create({ data: { email, name: input.name?.trim(), passwordHash: await this.tokens.hashPassword(input.password) }, select: { id: true, email: true, name: true } }); return { user, accessToken: this.tokens.signLocal(user), tokenType: 'Bearer', expiresIn: 3600 };
  }
  async login(input: { email: string; password: string }) { const user = await this.prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } }); if (!user?.passwordHash || !(await this.tokens.verifyPassword(input.password, user.passwordHash))) throw new UnauthorizedException('Email or password is incorrect.'); return { user: { id: user.id, email: user.email, name: user.name }, accessToken: this.tokens.signLocal(user), tokenType: 'Bearer', expiresIn: 3600 }; }
  async loginMicrosoft(entraAccessToken: string) {
    const claims = await this.tokens.verify(entraAccessToken);
    if (claims.iss === 'product-os') throw new UnauthorizedException('Provide a Microsoft Entra access token.');
    const entraObjectId = typeof claims.oid === 'string' ? claims.oid : '';
    const tenantId = typeof claims.tid === 'string' ? claims.tid : '';
    if (!entraObjectId || !tenantId) throw new UnauthorizedException('Microsoft identity is missing required claims.');
    const user = await this.prisma.user.findFirst({ where: { entraObjectId, entraTenantId: tenantId } });
    if (!user) throw new UnauthorizedException('This Microsoft account is not linked yet. Sign in with your Product OS password and link Microsoft from your account first.');
    return { user: { id: user.id, email: user.email, name: user.name }, accessToken: this.tokens.signLocal(user), tokenType: 'Bearer', expiresIn: 3600 };
  }

  async linkMicrosoft(userId: string, entraAccessToken: string) {
    const claims = await this.tokens.verify(entraAccessToken);
    if (claims.iss === 'product-os') throw new UnauthorizedException('Provide a Microsoft Entra access token.');
    const entraObjectId = typeof claims.oid === 'string' ? claims.oid : '';
    const tenantId = typeof claims.tid === 'string' ? claims.tid : '';
    const email = String(claims.preferred_username || claims.email || '').trim().toLowerCase();
    if (!entraObjectId || !tenantId || !email) throw new UnauthorizedException('Microsoft identity is missing required claims.');
    const localUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!localUser) throw new UnauthorizedException('Account no longer exists.');
    if (localUser.email.toLowerCase() !== email) throw new BadRequestException('The Microsoft account email must match your Product OS account email.');
    const existing = await this.prisma.user.findUnique({ where: { entraObjectId } });
    if (existing && existing.id !== userId) throw new ConflictException('This Microsoft identity is already linked to another Product OS account.');
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { entraObjectId, entraTenantId: tenantId }, select: { id: true, email: true, name: true, entraObjectId: true } });
    return { user: updated, linked: true };
  }

}

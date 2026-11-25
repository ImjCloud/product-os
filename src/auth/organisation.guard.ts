import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BearerAuthGuard } from './bearer-auth.guard';
export interface AuthenticatedRequest {
  user?: { sub?: string };
  headers: Record<string, string | string[] | undefined>;
  organisationMembership?: { organisationId: string; role: string; userId: string };
}
@Injectable()
export class OrganisationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly bearer: BearerAuthGuard) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.bearer.canActivate(context);
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = req.user?.sub;
    const raw = req.headers['x-organisation-id'];
    const organisationId = Array.isArray(raw) ? raw[0] : raw;
    // The organisation header is only a selector; membership is always verified server-side.
    if (!userId) throw new UnauthorizedException('Authenticated identity is required.');
    if (!organisationId) throw new ForbiddenException('Select an organisation.');
    const membership = await this.prisma.membership.findUnique({
      where: { organisationId_userId: { organisationId, userId } },
      select: { organisationId: true, userId: true, role: true },
    });
    if (!membership) throw new ForbiddenException('You are not a member of this organisation.');
    req.organisationMembership = membership;
    return true;
  }
}

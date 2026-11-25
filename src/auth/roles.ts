import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedRequest } from './organisation.guard';
const WRITE_ROLES = new Set(['OWNER', 'ADMIN', 'PRODUCT_MANAGER', 'CONTRIBUTOR']);
export function assertCanWrite(req: AuthenticatedRequest): void {
  if (!req.organisationMembership || !WRITE_ROLES.has(req.organisationMembership.role)) {
    throw new ForbiddenException('Your organisation role cannot make changes.');
  }
}

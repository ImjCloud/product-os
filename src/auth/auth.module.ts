import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { BearerAuthGuard } from './bearer-auth.guard';
import { OrganisationGuard } from './organisation.guard';
@Module({ controllers: [AuthController], providers: [AuthService, TokenService, BearerAuthGuard, OrganisationGuard], exports: [AuthService, TokenService, BearerAuthGuard, OrganisationGuard] })
export class AuthModule {}

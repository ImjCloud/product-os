import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrganisationsController } from './organisations.controller';
import { MembersController } from './members.controller';
@Module({ imports: [AuthModule], controllers: [OrganisationsController, MembersController] }) export class OrganisationsModule {}

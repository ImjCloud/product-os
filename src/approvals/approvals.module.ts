import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ApprovalsController } from './approvals.controller';
@Module({ imports: [AuthModule], controllers: [ApprovalsController] })
export class ApprovalsModule {}

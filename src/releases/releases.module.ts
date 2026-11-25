import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReleasesController } from './releases.controller';
@Module({ imports: [AuthModule], controllers: [ReleasesController] }) export class ReleasesModule {}

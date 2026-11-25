import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { DigestController } from './digest.controller';
@Module({ imports: [AuthModule], controllers: [NotificationsController, DigestController] }) export class NotificationsModule {}

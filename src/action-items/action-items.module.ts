import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ActionItemsController } from './action-items.controller';
@Module({ imports: [AuthModule], controllers: [ActionItemsController] }) export class ActionItemsModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InitiativesController } from './initiatives.controller';
@Module({ imports: [AuthModule], controllers: [InitiativesController] })
export class InitiativesModule {}

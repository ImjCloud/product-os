import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RequirementsController } from './requirements.controller';

@Module({ imports: [AuthModule], controllers: [RequirementsController] })
export class RequirementsModule {}

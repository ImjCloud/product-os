import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalysisRegistersController } from './analysis-registers.controller';

@Module({ imports: [AuthModule], controllers: [AnalysisRegistersController] })
export class AnalysisRegistersModule {}

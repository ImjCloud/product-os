import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalysisDeliveryController } from './analysis-delivery.controller';
@Module({ imports: [AuthModule], controllers: [AnalysisDeliveryController] })
export class AnalysisDeliveryModule {}

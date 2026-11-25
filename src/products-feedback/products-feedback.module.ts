import { Module } from '@nestjs/common';
import { ProductsFeedbackController } from './products-feedback.controller';
import { AuthModule } from '../auth/auth.module';
@Module({ imports: [AuthModule], controllers: [ProductsFeedbackController] })
export class ProductsFeedbackModule {}

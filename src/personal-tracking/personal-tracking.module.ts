import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersonalTrackingController } from './personal-tracking.controller';
@Module({ imports: [AuthModule], controllers: [PersonalTrackingController] })
export class PersonalTrackingModule {}

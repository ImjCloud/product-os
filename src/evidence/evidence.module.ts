import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EvidenceController } from './evidence.controller';
@Module({ imports: [AuthModule], controllers: [EvidenceController] })
export class EvidenceModule {}

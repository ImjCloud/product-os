import { Module } from '@nestjs/common';
import { DocumentIntelligenceController } from './document-intelligence.controller';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [DocumentIntelligenceController],
})
export class DocumentIntelligenceModule {}
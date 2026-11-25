import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkspaceIntelligenceController } from './workspace-intelligence.controller';
@Module({ imports: [AuthModule], controllers: [WorkspaceIntelligenceController] })
export class WorkspaceIntelligenceModule {}

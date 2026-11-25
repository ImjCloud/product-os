import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { DatabaseModule } from './database/database.module';
import { ProductsFeedbackModule } from './products-feedback/products-feedback.module';
import { RequirementsModule } from './requirements/requirements.module';
import { AuthModule } from './auth/auth.module';
import { OrganisationsModule } from './organisations/organisations.module';
import { ReleasesModule } from './releases/releases.module';
import { MetricsModule } from './metrics/metrics.module';
import { AuditModule } from './audit/audit.module';
import { ActionItemsModule } from './action-items/action-items.module';
import { LegacyImportController } from './legacy-import/legacy-import.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { InitiativesModule } from './initiatives/initiatives.module';
import { DocumentIntelligenceModule } from './document-intelligence/document-intelligence.module';
import { AnalysisRegistersModule } from './analysis-registers/analysis-registers.module';
import { AnalysisDeliveryModule } from './analysis-delivery/analysis-delivery.module';
import { EvidenceModule } from './evidence/evidence.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { WorkspaceIntelligenceModule } from './workspace-intelligence/workspace-intelligence.module';
import { PersonalTrackingModule } from './personal-tracking/personal-tracking.module';

@Module({
  imports: [DatabaseModule, AuthModule, OrganisationsModule, ProductsFeedbackModule, RequirementsModule, ReleasesModule, MetricsModule, AuditModule, ActionItemsModule, NotificationsModule, InitiativesModule, DocumentIntelligenceModule, AnalysisRegistersModule, AnalysisDeliveryModule, EvidenceModule, ApprovalsModule, WorkspaceIntelligenceModule, PersonalTrackingModule],
  controllers: [HealthController, LegacyImportController],
})
export class AppModule {}

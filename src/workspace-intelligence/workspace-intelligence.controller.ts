import { BadRequestException, Controller, Get, NotFoundException, Param, Query, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedRequest, OrganisationGuard } from '../auth/organisation.guard';

@Controller()
@UseGuards(OrganisationGuard)
export class WorkspaceIntelligenceController {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProduct(productId: string, organisationId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, organisationId, archivedAt: null }, select: { id: true, name: true } });
    if (!product) throw new NotFoundException('Product not found.');
    return product;
  }

  @Get('products/:productId/my-work')
  async myWork(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const organisationId = req.organisationMembership!.organisationId;
    const userId = req.organisationMembership!.userId;
    await this.assertProduct(productId, organisationId);
    const now = new Date();
    const [actions, approvals, notifications] = await Promise.all([
      this.prisma.actionItem.findMany({
        where: { organisationId, productId, assigneeId: userId, status: { not: 'DONE' } },
        select: { id: true, title: true, description: true, status: true, priority: true, dueAt: true, updatedAt: true, initiative: { select: { id: true, name: true } } },
        orderBy: [{ dueAt: 'asc' }, { updatedAt: 'desc' }], take: 100,
      }),
      this.prisma.approvalRequest.findMany({
        where: { organisationId, productId, approverUserId: userId, status: 'PENDING' },
        select: { id: true, title: true, targetType: true, targetId: true, rationale: true, dueAt: true, createdAt: true, requester: { select: { name: true, email: true } } },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }], take: 100,
      }),
      this.prisma.notification.findMany({
        where: { organisationId, userId, readAt: null },
        select: { id: true, type: true, title: true, body: true, entityType: true, entityId: true, createdAt: true },
        orderBy: { createdAt: 'desc' }, take: 30,
      }),
    ]);
    const overdueActions = actions.filter(x => x.dueAt && x.dueAt < now).length;
    const overdueApprovals = approvals.filter(x => x.dueAt && x.dueAt < now).length;
    return {
      generatedAt: now.toISOString(),
      summary: { actionCount: actions.length, overdueActionCount: overdueActions, approvalCount: approvals.length, overdueApprovalCount: overdueApprovals, unreadNotificationCount: notifications.length },
      actions: actions.map(x => ({ ...x, kind: 'ACTION', overdue: !!x.dueAt && x.dueAt < now })),
      approvals: approvals.map(x => ({ ...x, kind: 'APPROVAL', overdue: !!x.dueAt && x.dueAt < now })),
      notifications,
    };
  }

  @Get('products/:productId/reports/:reportType')
  async report(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Param('reportType') reportType: string, @Query('initiativeId') initiativeId?: string) {
    const organisationId = req.organisationMembership!.organisationId;
    const product = await this.assertProduct(productId, organisationId);
    const allowed = ['DELIVERY', 'REQUIREMENTS', 'RAID', 'UAT'];
    if (!allowed.includes(reportType)) throw new BadRequestException(`Choose one of these report types: ${allowed.join(', ')}.`);
    if (initiativeId) {
      const initiative = await this.prisma.initiative.findFirst({ where: { id: initiativeId, productId, organisationId }, select: { id: true } });
      if (!initiative) throw new BadRequestException('The selected initiative does not belong to this product.');
    }
    const base: any = { organisationId, productId, ...(initiativeId ? { initiativeId } : {}) };
    const generatedAt = new Date();
    if (reportType === 'REQUIREMENTS') {
      const rows = await this.prisma.requirement.findMany({ where: base, select: { id: true, title: true, status: true, owner: true, acceptance: true, createdAt: true, updatedAt: true }, orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }] });
      return { reportType, title: 'Requirements status report', product: product.name, generatedAt, filters: { initiativeId: initiativeId || null }, summary: { total: rows.length, discovery: rows.filter(x => x.status === 'DISCOVERY').length, scoped: rows.filter(x => x.status === 'SCOPED').length, inBuild: rows.filter(x => x.status === 'IN_BUILD').length, shipped: rows.filter(x => x.status === 'SHIPPED').length }, rows };
    }
    if (reportType === 'RAID') {
      const [risks, issues, dependencies, decisions] = await Promise.all([
        this.prisma.risk.findMany({ where: base, orderBy: { updatedAt: 'desc' } }),
        this.prisma.issue.findMany({ where: base, orderBy: { updatedAt: 'desc' } }),
        this.prisma.dependency.findMany({ where: base, orderBy: { updatedAt: 'desc' } }),
        this.prisma.decision.findMany({ where: base, orderBy: { updatedAt: 'desc' } }),
      ]);
      return { reportType, title: 'RAID and decisions report', product: product.name, generatedAt, filters: { initiativeId: initiativeId || null }, summary: { risks: risks.length, issues: issues.length, dependencies: dependencies.length, decisions: decisions.length }, sections: { risks, issues, dependencies, decisions } };
    }
    if (reportType === 'UAT') {
      const tests = await this.prisma.testCase.findMany({ where: base, orderBy: { updatedAt: 'desc' } });
      const executions = await this.prisma.testExecution.findMany({ where: { organisationId, productId, testCaseId: { in: tests.map(x => x.id) } }, orderBy: { executedAt: 'desc' } });
      const cycleIds = [...new Set(executions.map(x => x.uatCycleId).filter((x): x is string => !!x))];
      const cycles = await this.prisma.uatCycle.findMany({ where: { organisationId, productId, ...(initiativeId ? { id: { in: cycleIds } } : {}) }, orderBy: { createdAt: 'desc' } });
      return { reportType, title: 'UAT and test readiness report', product: product.name, generatedAt, filters: { initiativeId: initiativeId || null }, scopeNote: initiativeId ? 'Test cases and executions are initiative-filtered. UAT cycles are included when they contain executions for those test cases; cycles without linked executions cannot be attributed to an initiative.' : null, summary: { cycles: cycles.length, testCases: tests.length, executions: executions.length, passed: executions.filter(x => x.status === 'PASSED').length, failed: executions.filter(x => x.status === 'FAILED').length, blocked: executions.filter(x => x.status === 'BLOCKED').length }, sections: { cycles, testCases: tests, executions } };
    }
    const [initiatives, actions, requirements, releases, deployments, metrics] = await Promise.all([
      this.prisma.initiative.findMany({ where: { organisationId, productId, ...(initiativeId ? { id: initiativeId } : {}) }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.actionItem.findMany({ where: base, orderBy: [{ dueAt: 'asc' }, { updatedAt: 'desc' }] }),
      this.prisma.requirement.findMany({ where: base, orderBy: { updatedAt: 'desc' } }),
      this.prisma.release.findMany({ where: { organisationId, productId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.deployment.findMany({ where: { organisationId, productId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.metric.findMany({ where: { organisationId, productId }, orderBy: { updatedAt: 'desc' } }),
    ]);
    return { reportType, title: 'Delivery status report', product: product.name, generatedAt, filters: { initiativeId: initiativeId || null }, scopeNote: initiativeId ? 'Initiatives, actions and requirements are initiative-filtered. Releases, deployments and performance measures are shown at product level because those records are not directly linked to an initiative.' : null, summary: { initiatives: initiatives.length, openActions: actions.filter(x => x.status !== 'DONE').length, blockedActions: actions.filter(x => x.status === 'BLOCKED').length, requirements: requirements.length, releases: releases.length, deployments: deployments.length, performanceMeasures: metrics.length }, sections: { initiatives, actions, requirements, releases, deployments, metrics } };
  }
}

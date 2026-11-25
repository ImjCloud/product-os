import { BadRequestException, Body, Controller, Post, Req, UseGuards, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrganisationGuard, AuthenticatedRequest } from '../auth/organisation.guard';
import { assertCanWrite } from '../auth/roles';
import { PrismaService } from '../database/prisma.service';
import { legacyMaps, normaliseLegacyState, previewLegacyState } from './legacy-import.mapper';

@Controller('legacy-import')
@UseGuards(OrganisationGuard)
export class LegacyImportController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('preview') async preview(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    try { const state = normaliseLegacyState(body); const preview = previewLegacyState(state); const existing = await this.prisma.legacyImport.findUnique({ where: { organisationId_fingerprint: { organisationId: req.organisationMembership!.organisationId, fingerprint: preview.fingerprint } }, select: { id: true, createdAt: true } }); return { ...preview, alreadyImported: Boolean(existing), previousImport: existing }; }
    catch (e) { throw new BadRequestException(e instanceof Error ? e.message : 'Invalid legacy export.'); }
  }

  @Post('commit') async commit(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    assertCanWrite(req);
    let state; try { state = normaliseLegacyState(body); } catch (e) { throw new BadRequestException(e instanceof Error ? e.message : 'Invalid legacy export.'); }
    const org = req.organisationMembership!.organisationId;
    const actor = req.organisationMembership!.userId;
    const preview = previewLegacyState(state);
    const existingImport = await this.prisma.legacyImport.findUnique({ where: { organisationId_fingerprint: { organisationId: org, fingerprint: preview.fingerprint } } });
    if (existingImport) throw new ConflictException({ message: 'This exact legacy export has already been imported.', importId: existingImport.id, importedAt: existingImport.createdAt });

    const projects = state.proj!.length ? state.proj! : [{ id: 'default', name: 'Main project' }];
    const projectMap = new Map<string,string>();
    const requirementMap = new Map<string,string>();
    const releaseMap = new Map<string,string>();
    const result = await this.prisma.$transaction(async tx => {
      for (const p of projects) {
        const name = legacyMaps.clean(p.name, 'Main project').slice(0,120) || 'Main project';
        let product = await tx.product.findFirst({ where: { organisationId: org, name } });
        if (!product) product = await tx.product.create({ data: { organisationId: org, name, description: 'Imported from Product OS legacy workspace.' } });
        projectMap.set(legacyMaps.clean(p.id, 'default'), product.id);
      }
      const productFor = (row: any) => projectMap.get(legacyMaps.clean(row.proj, 'default')) || projectMap.get('default') || projectMap.values().next().value!;
      for (const r of state.rel!) {
        const productId = productFor(r); const version = legacyMaps.clean(r.ver, 'Imported release').slice(0,80) || 'Imported release';
        const existing = await tx.release.findFirst({ where: { productId, version } });
        const ready = ['uat','docs','training','rollback','comms'].every(k => Boolean(r.ck?.[k]));
        const legacyStatus = legacyMaps.releaseStatus(r.status);
        const release = existing || await tx.release.create({ data: { organisationId: org, productId, version, targetDate: legacyMaps.date(r.date), status: legacyStatus === 'READY' && !ready ? 'PLANNING' : legacyStatus as any } });
        releaseMap.set(legacyMaps.clean(r.id), release.id);
        const checks: [string,string][] = [['uat','UAT signed off'],['docs','Documentation ready'],['training','Training completed'],['rollback','Rollback plan ready'],['comms','Stakeholders informed']];
        if (!existing) for (const [key,label] of checks) await tx.releaseCheck.create({ data: { releaseId: release.id, key, label, completed: Boolean(r.ck?.[key]) } });
        const decisions = Array.isArray(r.log) ? r.log.map((entry:any)=>({ decision: legacyMaps.clean(entry.dec).toLowerCase()==='go'?'GO':'NO_GO', note: legacyMaps.clean(entry.note,'Imported legacy decision'), owner: legacyMaps.clean(entry.by), at: legacyMaps.date(entry.date)?.toISOString() || new Date().toISOString(), legacy: true })) : [];
        if (decisions.length && !existing) await tx.release.update({ where: { id: release.id }, data: { decisionLog: decisions as Prisma.InputJsonValue } });
        if (!existing) await tx.auditLog.create({ data: { organisationId: org, actorUserId: actor, entityType: 'Release', entityId: release.id, action: 'LEGACY_IMPORTED', after: { version, legacyId: r.id } as Prisma.InputJsonValue } });
      }
      for (const r of state.req!) {
        const productId = productFor(r);
        const requirement = await tx.requirement.create({ data: { organisationId: org, productId, title: legacyMaps.clean(r.title,'Untitled requirement').slice(0,240), problem: legacyMaps.clean(r.problem), userStory: legacyMaps.clean(r.story), acceptance: legacyMaps.clean(r.ac), status: legacyMaps.requirementStatus(r.status) as any, owner: legacyMaps.clean(r.owner) || null, reach: Math.max(0,Number(r.reach)||100), impact: Math.max(0,Number(r.impact)||1), confidence: Math.max(0,Math.min(100,Number(r.conf)||50)), effort: Math.max(0.1,Number(r.effort)||2), releaseId: releaseMap.get(legacyMaps.clean(r.rel)) || null } });
        requirementMap.set(legacyMaps.clean(r.id), requirement.id);
      }
      for (const f of state.fb!) {
        const productId = productFor(f);
        const severity = legacyMaps.severity(f.sev);
        const priority = severity === 'CRITICAL' ? 'URGENT' : severity === 'HIGH' ? 'HIGH' : severity === 'LOW' ? 'LOW' : 'MEDIUM';
        const status = legacyMaps.feedbackStatus(f.status);
        const extra = [f.src ? `Source: ${f.src}` : '', f.seg ? `Segment: ${f.seg}` : '', f.th ? `Theme: ${f.th}` : '', f.sen ? `Sentiment: ${f.sen}` : '', f.link ? `Source link: ${f.link}` : '', f.ref ? `Reference: ${f.ref}` : ''].filter(Boolean).join('\n');
        await tx.actionItem.create({ data: { organisationId: org, productId, title: legacyMaps.clean(f.text,'Imported action point').slice(0,240), description: extra, status: status === 'DONE' ? 'DONE' : status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'TODO', priority: priority as any, assigneeLabel: legacyMaps.clean(f.owner) || null, dueAt: legacyMaps.date(f.due), requirementId: requirementMap.get(legacyMaps.clean(f.req)) || null, createdById: actor } });
      }
      for (const m of state.met!) {
        const productId = productFor(m);
        await tx.metric.create({ data: { organisationId: org, productId, name: legacyMaps.clean(m.name,'Imported metric').slice(0,160), baseline: Number(m.base)||0, target: Number(m.target)||0, actual: Number(m.act)||0, direction: 'HIGHER_IS_BETTER', reviewDate: legacyMaps.date(m.date), releaseId: releaseMap.get(legacyMaps.clean(m.rel)) || null } });
      }
      const imported = await tx.legacyImport.create({ data: { organisationId: org, fingerprint: preview.fingerprint, counts: preview.counts as Prisma.InputJsonValue, warnings: preview.warnings as Prisma.InputJsonValue, sourcePayload: state as unknown as Prisma.InputJsonValue, createdById: actor } });
      await tx.auditLog.create({ data: { organisationId: org, actorUserId: actor, entityType: 'LegacyImport', entityId: imported.id, action: 'COMPLETED', after: { counts: preview.counts, warnings: preview.warnings } as Prisma.InputJsonValue } });
      return { importId: imported.id, counts: preview.counts, warnings: preview.warnings, productsCreatedOrMatched: projectMap.size };
    }, { timeout: 120000, maxWait: 10000 });
    return { success: true, ...result };
  }
}

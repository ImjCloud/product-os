import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, Patch, Post, Req, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { OrganisationGuard, AuthenticatedRequest } from '../auth/organisation.guard';
import { assertCanWrite } from '../auth/roles';
import { PrismaService } from '../database/prisma.service';
import { extractDocument } from './document-extractor';

const MAX_FILE = 15 * 1024 * 1024;
type CandidateType = 'REQUIREMENT'|'ACTION_ITEM'|'FEEDBACK'|'DECISION'|'RISK'|'DEPENDENCY'|'QUESTION';
function classify(line: string): { type: CandidateType; confidence: number; rationale: string } {
  const t = line.toLowerCase();
  const patterns: Array<[CandidateType, RegExp, number, string]> = [
    ['ACTION_ITEM', /\b(action|todo|to-do|follow up|follow-up|assigned to|owner:|responsible|by\s+\d{1,2}[\/.-]|deadline|shall complete|will send|will update|please|must submit)\b/i, 88, 'Contains task, ownership, deadline or follow-up language.'],
    ['REQUIREMENT', /\b(requirement|the system shall|system must|user should be able to|users can|must support|needs to allow|acceptance criteria|feature request|functionality)\b/i, 91, 'Describes a capability, behaviour or constraint.'],
    ['DECISION', /\b(decision|agreed that|approved that|it was agreed|we will proceed|selected option|confirmed approach|resolved to)\b/i, 86, 'Contains agreement, approval or selected-outcome language.'],
    ['RISK', /\b(risk|may delay|might fail|could impact|potential issue|threat|dependency risk|at risk|blocker)\b/i, 85, 'Describes a potential threat, uncertainty or delivery blocker.'],
    ['DEPENDENCY', /\b(depend(s|ent|ency) on|subject to|awaiting|blocked by|requires input from|pending approval from)\b/i, 82, 'Describes an external prerequisite or dependency.'],
    ['QUESTION', /\?|\b(open question|clarify|clarification needed|to confirm|unknown whether|who will|when will|what is the)\b/i, 78, 'Contains a question or unresolved clarification.'],
    ['FEEDBACK', /\b(user feedback|customer said|users reported|complaint|dissatisfied|suggestion|request from customer|pain point|usability)\b/i, 80, 'Describes an observation, complaint or suggestion.'],
  ];
  for (const [type, pattern, confidence, rationale] of patterns) if (pattern.test(t)) return { type, confidence, rationale };
  return { type: 'FEEDBACK', confidence: 42, rationale: 'No clear classification pattern was found. Confirm the record type before approval.' };
}
function splitRecords(text: string, fileName: string): Array<{ text: string; sourceReference: string }> {
  const ext = fileName.toLowerCase().split('.').pop(); let sheet = ''; let row = 0; let paragraph = 0;
  const records: Array<{ text: string; sourceReference: string }> = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*(?:[-*•]+|\d+[.)])\s*/, '').trim();
    if (/^SHEET:\s*/i.test(line)) { sheet = line.replace(/^SHEET:\s*/i, ''); row = 0; continue; }
    if (!line) continue;
    if (ext === 'xlsx' || ext === 'csv') row++;
    const segments = ext === 'pdf' ? line.split(/(?<=[.!?])\s+(?=[A-Z0-9•-])/) : [line];
    for (const segment of segments) {
      const value = segment.trim(); if (value.length < 18 || value.length > 3000) continue;
      paragraph++;
      const reference = ext === 'xlsx' ? `${sheet || 'Workbook'} · row ${row}` : ext === 'csv' ? `CSV row ${row + 1}` : ext === 'docx' ? `Paragraph ${paragraph}` : ext === 'pdf' ? `Extracted segment ${paragraph}` : `Line ${paragraph}`;
      records.push({ text: value, sourceReference: reference });
      if (records.length >= 200) return records;
    }
  }
  return records;
}
function extractOwner(line: string): string | null {
  const match = line.match(/\b(?:assigned to|owner|action owner|responsible(?: person)?)\s*[:\-]?\s*([^,;.\n]+?)(?=\s+\b(?:by|due|deadline)\b|[,;. ]*$)/i);
  const value = match?.[1]?.trim(); return value && value.length <= 160 ? value : null;
}
function extractDueDate(line: string): Date | null {
  const iso = line.match(/\b(20\d{2}-\d{2}-\d{2})\b/); const local = line.match(/\b(\d{1,2}[\/-]\d{1,2}[\/-]20\d{2})\b/);
  const named = line.match(/\b(?:by|due|deadline)\s+((?:\d{1,2}\s+)?[A-Za-z]{3,9}\s+20\d{2})\b/i);
  const raw = iso?.[1] || local?.[1] || named?.[1]; if (!raw) return null;
  let date: Date;
  if (iso) { const parts = raw.split('-').map(Number); date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12)); if (date.getUTCFullYear() !== parts[0] || date.getUTCMonth() !== parts[1] - 1 || date.getUTCDate() !== parts[2]) return null; }
  else if (local) { const parts = raw.split(/[\/-]/).map(Number); date = new Date(Date.UTC(parts[2], parts[1] - 1, parts[0], 12)); if (date.getUTCFullYear() !== parts[2] || date.getUTCMonth() !== parts[1] - 1 || date.getUTCDate() !== parts[0]) return null; }
  else { date = new Date(raw); if (Number.isNaN(date.getTime())) return null; }
  return Number.isNaN(date.getTime()) ? null : date;
}
function extractPriority(line: string): string {
  const t = line.toLowerCase(); if (/\b(urgent|critical|immediately|asap)\b/.test(t)) return 'URGENT'; if (/\b(high priority|high-priority)\b/.test(t)) return 'HIGH'; if (/\b(low priority|low-priority)\b/.test(t)) return 'LOW'; return 'MEDIUM';
}
@Controller('document-intelligence')
@UseGuards(OrganisationGuard)
export class DocumentIntelligenceController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE, files: 1 } }))
  async upload(@Req() req: AuthenticatedRequest, @UploadedFile() file: any, @Body('productId') productId: string) {
    assertCanWrite(req);
    if (!file?.buffer) throw new BadRequestException('Choose one document to upload.');
    if (!productId) throw new BadRequestException('A product must be selected.');
    const org = req.organisationMembership!.organisationId;
    const product = await this.prisma.product.findFirst({ where: { id: productId, organisationId: org, archivedAt: null }, select: { id: true } });
    if (!product) throw new NotFoundException('Active product not found in this organisation.');
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const existing = await this.prisma.documentImport.findUnique({ where: { organisationId_fileHash: { organisationId: org, fileHash: hash } }, select: { id: true, fileName: true } });
    if (existing) throw new ConflictException({ message: 'This exact document has already been imported into the workspace.', importId: existing.id, alreadyUploaded: true });
    let extracted: { text: string; note: string };
    try { extracted = extractDocument(file.originalname, file.buffer); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Unable to extract this document.'); }
    const scannedPdf = file.originalname.toLowerCase().endsWith('.pdf') && extracted.note.includes('OCR is not enabled');
    if (!extracted.text.trim() && !scannedPdf) throw new BadRequestException(extracted.note || 'No text could be extracted from this file.');
    const records = splitRecords(extracted.text, file.originalname);
    const batch = await this.prisma.documentImport.create({ data: { organisationId: org, productId, uploadedById: req.organisationMembership!.userId, fileName: String(file.originalname).slice(0, 255), mimeType: String(file.mimetype || 'application/octet-stream').slice(0, 120), fileSize: file.size, fileHash: hash, fileContent: new Uint8Array(file.buffer), extractedText: extracted.text.slice(0, 500000), extractionNote: extracted.note, status: 'NEEDS_REVIEW' } });
    if (records.length) await this.prisma.documentCandidate.createMany({ data: records.map(record => { const line = record.text; const result = classify(line); const title = line.length > 180 ? `${line.slice(0, 177)}…` : line; return { organisationId: org, productId, importId: batch.id, type: result.type, title, description: line, ownerLabel: extractOwner(line), dueAt: extractDueDate(line), priority: extractPriority(line), confidence: result.confidence, confidenceBand: result.confidence >= 85 ? 'HIGH' : result.confidence >= 65 ? 'MEDIUM' : 'LOW', sourceReference: record.sourceReference, rationale: result.rationale }; }) });
    await this.prisma.auditLog.create({ data: { organisationId: org, actorUserId: req.organisationMembership!.userId, entityType: 'DocumentImport', entityId: batch.id, action: 'DOCUMENT_UPLOADED_FOR_REVIEW', after: { fileName: batch.fileName, candidates: records.length, fileSize: batch.fileSize } as Prisma.InputJsonValue } });
    return this.prisma.documentImport.findFirst({ where: { id: batch.id, organisationId: org }, select: { id: true, fileName: true, fileSize: true, status: true, extractionNote: true, createdAt: true, candidates: { orderBy: { createdAt: 'asc' } } } });
  }

  @Get('products/:productId/imports')
  async list(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const org = req.organisationMembership!.organisationId;
    const product = await this.prisma.product.findFirst({ where: { id: productId, organisationId: org }, select: { id: true } }); if (!product) throw new NotFoundException('Product not found.');
    return this.prisma.documentImport.findMany({ where: { organisationId: org, productId }, select: { id: true, fileName: true, fileSize: true, status: true, extractionNote: true, createdAt: true, candidates: { orderBy: [{ status: 'asc' }, { createdAt: 'asc' }] } }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  @Get('imports/:importId/source')
  async source(@Req() req: AuthenticatedRequest, @Param('importId') id: string) {
    const org = req.organisationMembership!.organisationId;
    const row = await this.prisma.documentImport.findFirst({ where: { id, organisationId: org }, select: { fileName: true, mimeType: true, fileContent: true } });
    if (!row) throw new NotFoundException('Source document not found.');
    const safeName = encodeURIComponent(row.fileName.replace(/[\r\n\"']/g, '_'));
    return new StreamableFile(Buffer.from(row.fileContent), { type: row.mimeType || 'application/octet-stream', disposition: `attachment; filename*=UTF-8''${safeName}` });
  }

  @Patch('candidates/:candidateId')
  async review(@Req() req: AuthenticatedRequest, @Param('candidateId') id: string, @Body() body: any) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId;
    const current = await this.prisma.documentCandidate.findFirst({ where: { id, organisationId: org } }); if (!current) throw new NotFoundException('Extracted candidate not found.');
    const types: CandidateType[] = ['REQUIREMENT','ACTION_ITEM','FEEDBACK','DECISION','RISK','DEPENDENCY','QUESTION'];
    if (body?.type && !types.includes(body.type)) throw new BadRequestException('Unsupported classification.');
    if (body?.status && !['NEEDS_REVIEW','APPROVED','REJECTED'].includes(body.status)) throw new BadRequestException('Review status must be NEEDS_REVIEW, APPROVED or REJECTED.');
    if (body?.confidence !== undefined && (!Number.isInteger(body.confidence) || body.confidence < 0 || body.confidence > 100)) throw new BadRequestException('Confidence must be an integer from 0 to 100.');
    if (current.status === 'IMPORTED') throw new BadRequestException('Imported candidates are locked to preserve the created workspace record and audit trail.');
    if (body?.description !== undefined && typeof body.description !== 'string') throw new BadRequestException('Candidate detail must be text.');
    if (body?.ownerLabel !== undefined && body.ownerLabel !== null && typeof body.ownerLabel !== 'string') throw new BadRequestException('Owner must be text.');
    if (body?.reviewNote !== undefined && typeof body.reviewNote !== 'string') throw new BadRequestException('Review note must be text.');
    if (body?.priority !== undefined && !['LOW','MEDIUM','HIGH','URGENT'].includes(String(body.priority).toUpperCase())) throw new BadRequestException('Priority must be LOW, MEDIUM, HIGH or URGENT.');
    let dueAt = current.dueAt;
    if (body?.dueAt !== undefined) { if (body.dueAt === null || body.dueAt === '') dueAt = null; else if (typeof body.dueAt === 'string' && !Number.isNaN(Date.parse(body.dueAt))) dueAt = new Date(body.dueAt); else throw new BadRequestException('Due date must be a valid date or empty.'); }
    const title = body?.title === undefined ? current.title : (typeof body.title === 'string' ? body.title.trim() : ''); if (!title || title.length > 500) throw new BadRequestException('Candidate title must be 1–500 characters.');
    return this.prisma.documentCandidate.update({ where: { id }, data: { type: body.type ?? current.type, status: body.status ?? current.status, title, description: body.description === undefined ? current.description : body.description.slice(0, 10000), ownerLabel: body.ownerLabel === undefined ? current.ownerLabel : (body.ownerLabel ? body.ownerLabel.trim().slice(0, 160) : null), dueAt, priority: body.priority === undefined ? current.priority : String(body.priority).toUpperCase(), confidence: body.confidence ?? current.confidence, confidenceBand: (body.confidence ?? current.confidence) >= 85 ? 'HIGH' : (body.confidence ?? current.confidence) >= 65 ? 'MEDIUM' : 'LOW', reviewNote: body.reviewNote === undefined ? current.reviewNote : body.reviewNote.slice(0, 2000) } });
  }

  @Post('imports/:importId/commit')
  async commit(@Req() req: AuthenticatedRequest, @Param('importId') id: string) {
    assertCanWrite(req); const org = req.organisationMembership!.organisationId; const userId = req.organisationMembership!.userId;
    const batch = await this.prisma.documentImport.findFirst({ where: { id, organisationId: org }, select: { id: true, productId: true, fileName: true, candidates: true } }); if (!batch) throw new NotFoundException('Import batch not found.');
    const approved = batch.candidates.filter(c => c.status === 'APPROVED'); if (!approved.length) throw new BadRequestException('Approve at least one reviewed candidate before importing.');
    const outcomes: Array<{ candidateId: string; type: string; entityId?: string; outcome: string }> = [];
    await this.prisma.$transaction(async tx => {
      for (const candidate of approved) {
        if (candidate.status === 'IMPORTED') { outcomes.push({ candidateId: candidate.id, type: candidate.type, entityId: candidate.importedEntityId ?? undefined, outcome: 'already imported' }); continue; }
        let entityId: string | undefined; let entityType: string | undefined;
        if (candidate.type === 'FEEDBACK') { const row = await tx.feedback.create({ data: { organisationId: org, productId: batch.productId, text: candidate.description || candidate.title, source: `Document: ${batch.fileName}`, owner: candidate.ownerLabel, dueAt: candidate.dueAt } }); entityId = row.id; entityType = 'Feedback'; }
        else if (candidate.type === 'REQUIREMENT') { const row = await tx.requirement.create({ data: { organisationId: org, productId: batch.productId, title: candidate.title, problem: candidate.description, owner: candidate.ownerLabel } }); entityId = row.id; entityType = 'Requirement'; }
        else if (candidate.type === 'ACTION_ITEM') { const row = await tx.actionItem.create({ data: { organisationId: org, productId: batch.productId, title: candidate.title, description: candidate.description, priority: ['LOW','MEDIUM','HIGH','URGENT'].includes(candidate.priority) ? candidate.priority as any : 'MEDIUM', dueAt: candidate.dueAt, assigneeLabel: candidate.ownerLabel, createdById: userId } }); entityId = row.id; entityType = 'ActionItem'; }
        await tx.documentCandidate.update({ where: { id: candidate.id }, data: { status: entityId ? 'IMPORTED' : 'APPROVED', importedEntityId: entityId, importedEntityType: entityType } });
        outcomes.push({ candidateId: candidate.id, type: candidate.type, entityId, outcome: entityId ? 'imported' : 'approved for register; native register is not enabled for this type yet' });
      }
      const remaining = await tx.documentCandidate.count({ where: { importId: id, status: 'NEEDS_REVIEW' } }); const importable = await tx.documentCandidate.count({ where: { importId: id, status: 'APPROVED' } });
      await tx.documentImport.update({ where: { id }, data: { status: remaining || importable ? 'PARTIALLY_IMPORTED' : 'IMPORTED' } });
      await tx.auditLog.create({ data: { organisationId: org, actorUserId: userId, entityType: 'DocumentImport', entityId: id, action: 'DOCUMENT_CANDIDATES_COMMITTED', after: { outcomes } as Prisma.InputJsonValue } });
    });
    return { importId: id, outcomes, importedCount: outcomes.filter(x => x.outcome === 'imported').length };
  }
}

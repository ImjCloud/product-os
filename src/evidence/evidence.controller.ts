import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest, OrganisationGuard } from '../auth/organisation.guard';
import { assertCanWrite } from '../auth/roles';
import { PrismaService } from '../database/prisma.service';

const TARGETS = ['INITIATIVE','REQUIREMENT','ACTION_ITEM','DECISION','RISK','DEPENDENCY','STAKEHOLDER','ISSUE','CHANGE_REQUEST','PROCESS_ANALYSIS','TEST_CASE','TEST_EXECUTION','RELEASE','DEPLOYMENT','BENEFIT'] as const;
const TYPES = ['DOCUMENT','SCREENSHOT','TEST_RESULT','APPROVAL','MEETING_NOTE','REPORT','URL','OTHER'] as const;
const STATUSES = ['UNVERIFIED','VERIFIED','REJECTED'] as const;
@Controller('products/:productId/evidence')
@UseGuards(OrganisationGuard)
export class EvidenceController {
  constructor(private readonly prisma: PrismaService) {}
  private async product(productId:string, organisationId:string) {
    const row=await this.prisma.product.findFirst({where:{id:productId,organisationId},select:{id:true}});
    if(!row) throw new NotFoundException('Product not found.');
  }
  private async targetExists(type:string,id:string,productId:string,organisationId:string) {
    const delegates:Record<string,string>={INITIATIVE:'initiative',REQUIREMENT:'requirement',ACTION_ITEM:'actionItem',DECISION:'decision',RISK:'risk',DEPENDENCY:'dependency',STAKEHOLDER:'stakeholder',ISSUE:'issue',CHANGE_REQUEST:'changeRequest',PROCESS_ANALYSIS:'processAnalysis',TEST_CASE:'testCase',TEST_EXECUTION:'testExecution',RELEASE:'release',DEPLOYMENT:'deployment',BENEFIT:'benefitMeasure'};
    const delegate=(this.prisma as any)[delegates[type]];
    const found=await delegate.findFirst({where:{id,productId,organisationId},select:{id:true}});
    if(!found) throw new BadRequestException('The linked record does not exist in this product and organisation.');
  }
  private async linkedInitiative(type:string,id:string,productId:string,organisationId:string):Promise<string|null> {
    if(type==='INITIATIVE') return id;
    const models:Record<string,string>={REQUIREMENT:'requirement',ACTION_ITEM:'actionItem',DECISION:'decision',RISK:'risk',DEPENDENCY:'dependency',STAKEHOLDER:'stakeholder',ISSUE:'issue',CHANGE_REQUEST:'changeRequest',PROCESS_ANALYSIS:'processAnalysis',TEST_CASE:'testCase',BENEFIT:'benefitMeasure'};
    const model=models[type]; if(!model)return null;
    const row=await (this.prisma as any)[model].findFirst({where:{id,productId,organisationId},select:{initiativeId:true}});
    return row?.initiativeId||null;
  }
  @Get('coverage') async coverage(@Req() req:AuthenticatedRequest,@Param('productId') productId:string) {
    const org=req.organisationMembership!.organisationId; await this.product(productId,org);
    const [evidence,requirements,testCases,releases,decisions,risks,changes,processes]=await Promise.all([
      this.prisma.evidenceItem.findMany({where:{organisationId:org,productId},select:{targetType:true,targetId:true,verificationStatus:true}}),
      this.prisma.requirement.findMany({where:{organisationId:org,productId},select:{id:true}}),
      this.prisma.testCase.findMany({where:{organisationId:org,productId},select:{id:true}}),
      this.prisma.release.findMany({where:{organisationId:org,productId},select:{id:true}}),
      this.prisma.decision.findMany({where:{organisationId:org,productId},select:{id:true}}),
      this.prisma.risk.findMany({where:{organisationId:org,productId},select:{id:true}}),
      this.prisma.changeRequest.findMany({where:{organisationId:org,productId},select:{id:true}}),
      this.prisma.processAnalysis.findMany({where:{organisationId:org,productId},select:{id:true}}),
    ]);
    const coverage=[['Requirements','REQUIREMENT',requirements],['Test cases','TEST_CASE',testCases],['Releases','RELEASE',releases],['Decisions','DECISION',decisions],['Risks','RISK',risks],['Change requests','CHANGE_REQUEST',changes],['Process analyses','PROCESS_ANALYSIS',processes]] as const;
    const byType=coverage.map(([label,type,records])=>{const linked=new Set(evidence.filter(x=>x.targetType===type).map(x=>x.targetId));const covered=records.filter(x=>linked.has(x.id)).length;return {label,targetType:type,total:records.length,covered,withoutEvidence:records.length-covered,coveragePercent:records.length?Math.round(covered/records.length*100):null};});
    return {generatedAt:new Date().toISOString(),summary:{total:evidence.length,verified:evidence.filter(x=>x.verificationStatus==='VERIFIED').length,unverified:evidence.filter(x=>x.verificationStatus==='UNVERIFIED').length,rejected:evidence.filter(x=>x.verificationStatus==='REJECTED').length},byType};
  }
  @Get('targets') async targetOptions(@Req() req:AuthenticatedRequest,@Param('productId') productId:string,@Query('targetType') targetType:string) {
    const org=req.organisationMembership!.organisationId; await this.product(productId,org);
    if(!(TARGETS as readonly string[]).includes(targetType)) throw new BadRequestException('Choose a supported evidence target type.');
    const config:Record<string,{model:string;select:any;label:(row:any)=>string}>={
      INITIATIVE:{model:'initiative',select:{id:true,name:true},label:r=>r.name}, REQUIREMENT:{model:'requirement',select:{id:true,title:true},label:r=>r.title}, ACTION_ITEM:{model:'actionItem',select:{id:true,title:true},label:r=>r.title},
      DECISION:{model:'decision',select:{id:true,title:true},label:r=>r.title}, RISK:{model:'risk',select:{id:true,title:true},label:r=>r.title}, DEPENDENCY:{model:'dependency',select:{id:true,title:true},label:r=>r.title},
      STAKEHOLDER:{model:'stakeholder',select:{id:true,name:true,role:true},label:r=>`${r.name}${r.role?` · ${r.role}`:''}`}, ISSUE:{model:'issue',select:{id:true,title:true},label:r=>r.title},
      CHANGE_REQUEST:{model:'changeRequest',select:{id:true,title:true},label:r=>r.title}, PROCESS_ANALYSIS:{model:'processAnalysis',select:{id:true,title:true},label:r=>r.title}, TEST_CASE:{model:'testCase',select:{id:true,key:true,title:true},label:r=>`${r.key} · ${r.title}`},
      TEST_EXECUTION:{model:'testExecution',select:{id:true,status:true,executedAt:true},label:r=>`${r.status} · ${new Date(r.executedAt).toLocaleString()}`}, RELEASE:{model:'release',select:{id:true,version:true,status:true},label:r=>`${r.version} · ${r.status}`},
      DEPLOYMENT:{model:'deployment',select:{id:true,environment:true,status:true,createdAt:true},label:r=>`${r.environment} · ${r.status} · ${new Date(r.createdAt).toLocaleDateString()}`}, BENEFIT:{model:'benefitMeasure',select:{id:true,title:true},label:r=>r.title}
    };
    const c=config[targetType]; const rows=await (this.prisma as any)[c.model].findMany({where:{organisationId:org,productId},select:c.select,orderBy:{createdAt:'desc'},take:300});
    return rows.map((row:any)=>({id:row.id,label:c.label(row)}));
  }
  @Get() async list(@Req() req:AuthenticatedRequest,@Param('productId') productId:string,@Query('targetType') targetType?:string,@Query('targetId') targetId?:string,@Query('initiativeId') initiativeId?:string) {
    const org=req.organisationMembership!.organisationId; await this.product(productId,org);
    const where:any={organisationId:org,productId};
    if(targetType){if(!(TARGETS as readonly string[]).includes(targetType))throw new BadRequestException('Unsupported evidence target type.');where.targetType=targetType;}
    if(targetId)where.targetId=targetId;
    if(initiativeId)where.initiativeId=initiativeId;
    return this.prisma.evidenceItem.findMany({where,orderBy:{createdAt:'desc'},take:250});
  }
  @Post() async create(@Req() req:AuthenticatedRequest,@Param('productId') productId:string,@Body() body:any) {
    assertCanWrite(req); const org=req.organisationMembership!.organisationId; await this.product(productId,org);
    const parsed=z.object({title:z.string().trim().min(2).max(180),evidenceType:z.enum(TYPES).default('DOCUMENT'),targetType:z.enum(TARGETS),targetId:z.string().min(1).max(100),initiativeId:z.string().max(100).nullable().optional(),description:z.string().max(10000).optional(),sourceUrl:z.string().url().max(2000).refine(value=>['http:','https:'].includes(new URL(value).protocol),'Only HTTP and HTTPS source links are allowed.').nullable().optional(),referenceCode:z.string().max(180).nullable().optional(),capturedAt:z.string().datetime().nullable().optional(),ownerLabel:z.string().max(160).nullable().optional()}).strict().safeParse(body);
    if(!parsed.success)throw new BadRequestException(parsed.error.flatten()); const d=parsed.data;
    await this.targetExists(d.targetType,d.targetId,productId,org);
    const linkedInitiativeId=await this.linkedInitiative(d.targetType,d.targetId,productId,org);
    if(d.initiativeId&&linkedInitiativeId&&linkedInitiativeId!==d.initiativeId)throw new BadRequestException('Evidence initiative must match the initiative already linked to its target record.');
    const effectiveInitiativeId=d.initiativeId||linkedInitiativeId;
    if(effectiveInitiativeId){const initiative=await this.prisma.initiative.findFirst({where:{id:effectiveInitiativeId,productId,organisationId:org},select:{id:true}});if(!initiative)throw new BadRequestException('Initiative must belong to the same product and organisation.');}
    return this.prisma.$transaction(async tx=>{const row=await tx.evidenceItem.create({data:{organisationId:org,productId,title:d.title,evidenceType:d.evidenceType,targetType:d.targetType,targetId:d.targetId,initiativeId:effectiveInitiativeId,description:d.description||'',sourceUrl:d.sourceUrl||null,referenceCode:d.referenceCode||null,capturedAt:d.capturedAt?new Date(d.capturedAt):null,ownerLabel:d.ownerLabel||null}});await tx.auditLog.create({data:{organisationId:org,actorUserId:req.organisationMembership!.userId,entityType:'EvidenceItem',entityId:row.id,action:'CREATED',after:row as Prisma.InputJsonValue}});return row;});
  }
  @Patch(':id/verification') async verify(@Req() req:AuthenticatedRequest,@Param('productId') productId:string,@Param('id') id:string,@Body() body:any) {
    assertCanWrite(req);const org=req.organisationMembership!.organisationId;await this.product(productId,org);
    const parsed=z.object({verificationStatus:z.enum(STATUSES),verificationNotes:z.string().max(5000).optional()}).strict().safeParse(body);if(!parsed.success)throw new BadRequestException(parsed.error.flatten());
    const before=await this.prisma.evidenceItem.findFirst({where:{id,organisationId:org,productId}});if(!before)throw new NotFoundException('Evidence record not found.');
    return this.prisma.$transaction(async tx=>{const row=await tx.evidenceItem.update({where:{id},data:parsed.data});await tx.auditLog.create({data:{organisationId:org,actorUserId:req.organisationMembership!.userId,entityType:'EvidenceItem',entityId:id,action:'VERIFICATION_UPDATED',before:before as Prisma.InputJsonValue,after:row as Prisma.InputJsonValue}});return row;});
  }
}

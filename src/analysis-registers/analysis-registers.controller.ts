import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedRequest, OrganisationGuard } from '../auth/organisation.guard';
import { assertCanWrite } from '../auth/roles';
import { z } from 'zod';

const CONFIG = {
 decisions: { model: 'decision', entity: 'Decision', statuses: ['PROPOSED','APPROVED','REJECTED','DEFERRED','SUPERSEDED'], fields: ['title','context','rationale','outcome','ownerLabel','initiativeId','options','status','decidedAt'] },
 risks: { model: 'risk', entity: 'Risk', statuses: ['IDENTIFIED','MITIGATING','ACCEPTED','CLOSED'], fields: ['title','description','cause','consequence','mitigation','contingency','probability','impact','status','ownerLabel','reviewDate','initiativeId'] },
 dependencies: { model: 'dependency', entity: 'Dependency', statuses: ['OPEN','IN_PROGRESS','RESOLVED','BLOCKED'], fields: ['title','description','dependencyType','dependsOn','status','ownerLabel','neededBy','initiativeId'] },
 stakeholders: { model: 'stakeholder', entity: 'Stakeholder', statuses: ['UNAWARE','RESISTANT','NEUTRAL','SUPPORTIVE','LEADING'], fields: ['name','role','organisationName','interest','influence','engagement','engagementApproach','ownerLabel','initiativeId'] },
 issues: { model: 'issue', entity: 'Issue', statuses: ['OPEN','INVESTIGATING','IN_PROGRESS','RESOLVED','CLOSED'], fields: ['title','description','severity','status','impact','resolution','ownerLabel','dueAt','initiativeId'] },
 'change-requests': { model: 'changeRequest', entity: 'ChangeRequest', statuses: ['SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','DEFERRED','IMPLEMENTED'], fields: ['title','description','reason','scopeImpact','scheduleImpact','costImpact','riskImpact','requestedBy','status','decisionRationale','ownerLabel','initiativeId','reviewedAt'] },
} as const;
type Kind = keyof typeof CONFIG;
@Controller('products/:productId/analysis')
@UseGuards(OrganisationGuard)
export class AnalysisRegistersController {
 constructor(private readonly prisma: PrismaService) {}
 @Get('change-impact') async changeImpact(@Req() req: AuthenticatedRequest,@Param('productId') productId:string){
  const org=req.organisationMembership!.organisationId; await this.assertProduct(productId,org);
  const requests=await this.prisma.changeRequest.findMany({where:{organisationId:org,productId},orderBy:[{updatedAt:'desc'}],include:{initiative:{select:{id:true,name:true,status:true}}}});
  const initiativeIds=[...new Set(requests.map(r=>r.initiativeId).filter((v):v is string=>!!v))];
  const models=['requirement','actionItem','decision','risk','dependency','stakeholder','issue','processAnalysis','testCase','benefitMeasure'] as const;
  const counts=await Promise.all(models.map(async model=>{
   const rows=initiativeIds.length?await (this.prisma as any)[model].groupBy({by:['initiativeId'],where:{organisationId:org,productId,initiativeId:{in:initiativeIds}},_count:{_all:true}}):[];
   return [model,Object.fromEntries(rows.map((r:any)=>[r.initiativeId,r._count._all]))] as const;
  }));
  const countMap=Object.fromEntries(counts);
  return requests.map(change=>{
   const initiativeId=change.initiativeId;
   const affected=Object.fromEntries(models.map(model=>[model,initiativeId?(countMap[model]?.[initiativeId]||0):0]));
   const total=Object.values(affected).reduce((sum,value)=>sum+Number(value),0);
   return {...change,impactAssessment:{basis:initiativeId?'Linked initiative':'No initiative linked',affected,total,requiresManualReview:!initiativeId||total===0}};
  });
 }
 @Get('portfolio-intelligence') async portfolioIntelligence(@Req() req: AuthenticatedRequest,@Param('productId') productId:string){
  const org=req.organisationMembership!.organisationId; await this.assertProduct(productId,org);
  const [initiatives,actions,risks,issues,dependencies,decisions,changes,releases,deployments,tests,benefits,stakeholders,engagements]=await Promise.all([
   this.prisma.initiative.findMany({where:{organisationId:org,productId},select:{id:true,name:true,status:true,stageKey:true,ownerLabel:true,targetDate:true}}),
   this.prisma.actionItem.findMany({where:{organisationId:org,productId},select:{id:true,title:true,status:true,priority:true,dueAt:true,initiativeId:true}}),
   this.prisma.risk.findMany({where:{organisationId:org,productId},select:{id:true,title:true,status:true,probability:true,impact:true,reviewDate:true,initiativeId:true}}),
   this.prisma.issue.findMany({where:{organisationId:org,productId},select:{id:true,title:true,status:true,severity:true,dueAt:true,initiativeId:true}}),
   this.prisma.dependency.findMany({where:{organisationId:org,productId},select:{id:true,title:true,status:true,neededBy:true,initiativeId:true}}),
   this.prisma.decision.findMany({where:{organisationId:org,productId},select:{id:true,title:true,status:true,initiativeId:true}}),
   this.prisma.changeRequest.findMany({where:{organisationId:org,productId},select:{id:true,title:true,status:true,initiativeId:true}}),
   this.prisma.release.findMany({where:{organisationId:org,productId},select:{id:true,version:true,status:true,targetDate:true}}),
   this.prisma.deployment.findMany({where:{organisationId:org,productId},select:{id:true,environment:true,status:true,completedAt:true,createdAt:true,release:{select:{version:true}}},orderBy:{createdAt:'desc'},take:20}),
   this.prisma.testExecution.findMany({where:{organisationId:org,productId},select:{id:true,status:true,executedAt:true}}),
   this.prisma.benefitMeasure.findMany({where:{organisationId:org,productId},select:{id:true,title:true,status:true,baselineValue:true,targetValue:true,actualValue:true,lastMeasuredAt:true}}),
   this.prisma.stakeholder.findMany({where:{organisationId:org,productId},select:{id:true,name:true,engagement:true,influence:true,initiativeId:true}}),
   this.prisma.stakeholderEngagementLog.findMany({where:{organisationId:org,productId,followUpAt:{not:null}},select:{id:true,summary:true,nextAction:true,followUpAt:true,stakeholder:{select:{name:true}}},orderBy:{followUpAt:'asc'},take:50})
  ]);
  const now=new Date(); const openAction=actions.filter(x=>x.status!=='DONE');
  const overdueActions=openAction.filter(x=>x.dueAt&&x.dueAt<now);
  const openRisks=risks.filter(x=>!['CLOSED','ACCEPTED'].includes(x.status));
  const openIssues=issues.filter(x=>!['RESOLVED','CLOSED'].includes(x.status));
  const openDependencies=dependencies.filter(x=>x.status!=='RESOLVED');
  const pendingDecisions=decisions.filter(x=>x.status==='PROPOSED'||x.status==='DEFERRED');
  const pendingChanges=changes.filter(x=>['SUBMITTED','UNDER_REVIEW'].includes(x.status));
  const failedDeployments=deployments.filter(x=>x.status==='FAILED');
  const upcomingReleases=releases.filter(x=>x.status!=='RELEASED');
  const last30=new Date(now.getTime()-30*24*60*60*1000);
  const recentExecutions=tests.filter(x=>x.executedAt>=last30);
  const completedDeployments=deployments.filter(x=>x.status==='SUCCEEDED');
  const attention=[
   ...overdueActions.map(x=>({type:'OVERDUE_ACTION',id:x.id,title:x.title,detail:'Action item is overdue',initiativeId:x.initiativeId})),
   ...openRisks.filter(x=>x.impact>=4&&x.probability>=4).map(x=>({type:'HIGH_RISK',id:x.id,title:x.title,detail:'High probability and impact',initiativeId:x.initiativeId})),
   ...openIssues.filter(x=>x.severity==='CRITICAL'||x.severity==='HIGH').map(x=>({type:'SEVERE_ISSUE',id:x.id,title:x.title,detail:`${x.severity} issue`,initiativeId:x.initiativeId})),
   ...failedDeployments.map(x=>({type:'FAILED_DEPLOYMENT',id:x.id,title:`${x.release.version} · ${x.environment}`,detail:'Deployment failed',initiativeId:null}))
  ].slice(0,30);
  return {productId,generatedAt:now.toISOString(),counts:{initiatives:initiatives.length,activeInitiatives:initiatives.filter(x=>!['COMPLETED','CANCELLED'].includes(x.status)).length,actionsOutstanding:openAction.length,actionsOverdue:overdueActions.length,risksOpen:openRisks.length,issuesOpen:openIssues.length,dependenciesOpen:openDependencies.length,decisionsPending:pendingDecisions.length,changesPending:pendingChanges.length,releasesUpcoming:upcomingReleases.length,deploymentsFailed:failedDeployments.length,deploymentsSucceeded:completedDeployments.length,testsLast30Days:recentExecutions.length,testsPassedLast30Days:recentExecutions.filter(x=>x.status==='PASSED').length,benefitsTracking:benefits.filter(x=>['TRACKING','NOT_REALISING'].includes(x.status)).length,stakeholders:stakeholders.length,stakeholdersAtRisk:stakeholders.filter(x=>['UNAWARE','RESISTANT'].includes(x.engagement)).length},initiatives,attention,upcomingReleases,benefits,stakeholders,followUps:engagements};
 }
 @Get('stakeholders/:stakeholderId/engagements') async stakeholderEngagements(@Req() req:AuthenticatedRequest,@Param('productId') productId:string,@Param('stakeholderId') stakeholderId:string){
  const org=req.organisationMembership!.organisationId; await this.assertProduct(productId,org);
  const stakeholder=await this.prisma.stakeholder.findFirst({where:{id:stakeholderId,organisationId:org,productId},select:{id:true}}); if(!stakeholder)throw new NotFoundException('Stakeholder not found.');
  return this.prisma.stakeholderEngagementLog.findMany({where:{organisationId:org,productId,stakeholderId},orderBy:{occurredAt:'desc'}});
 }
 @Post('stakeholders/:stakeholderId/engagements') async createStakeholderEngagement(@Req() req:AuthenticatedRequest,@Param('productId') productId:string,@Param('stakeholderId') stakeholderId:string,@Body() body:any){
  assertCanWrite(req); const org=req.organisationMembership!.organisationId; await this.assertProduct(productId,org);
  const stakeholder=await this.prisma.stakeholder.findFirst({where:{id:stakeholderId,organisationId:org,productId},select:{id:true}}); if(!stakeholder)throw new NotFoundException('Stakeholder not found.');
  const parsed=z.object({occurredAt:z.string().datetime().optional(),channel:z.string().trim().min(2).max(40),purpose:z.string().max(3000).optional(),summary:z.string().trim().min(3).max(10000),outcome:z.string().max(5000).optional(),nextAction:z.string().max(3000).optional(),ownerLabel:z.string().max(160).nullable().optional(),followUpAt:z.string().datetime().nullable().optional()}).strict().safeParse(body);
  if(!parsed.success)throw new BadRequestException(parsed.error.flatten()); const d=parsed.data;
  return this.prisma.$transaction(async tx=>{const row=await tx.stakeholderEngagementLog.create({data:{organisationId:org,productId,stakeholderId,occurredAt:d.occurredAt?new Date(d.occurredAt):new Date(),channel:d.channel.toUpperCase(),purpose:d.purpose||'',summary:d.summary,outcome:d.outcome||'',nextAction:d.nextAction||'',ownerLabel:d.ownerLabel||null,followUpAt:d.followUpAt?new Date(d.followUpAt):null}});await tx.auditLog.create({data:{organisationId:org,actorUserId:req.organisationMembership!.userId,entityType:'StakeholderEngagementLog',entityId:row.id,action:'CREATED',after:row as Prisma.InputJsonValue}});return row;});
 }
 @Get(':kind') async list(@Req() req: AuthenticatedRequest,@Param('productId') productId:string,@Param('kind') kind:string){const c=this.config(kind);const org=req.organisationMembership!.organisationId;await this.assertProduct(productId,org);const rows=await (this.prisma as any)[c.model].findMany({where:{organisationId:org,productId},orderBy:{updatedAt:'desc'}});return kind==='stakeholders'?rows.map((r:any)=>({...r,title:r.name,status:r.engagement})):rows;}
 @Post(':kind') async create(@Req() req:AuthenticatedRequest,@Param('productId') productId:string,@Param('kind') kind:string,@Body() body:any){assertCanWrite(req);const c=this.config(kind);const org=req.organisationMembership!.organisationId;await this.assertProduct(productId,org);const data=this.clean(c,body,true);await this.assertInitiativeLink(data,productId,org);return this.prisma.$transaction(async tx=>{const row=await (tx as any)[c.model].create({data:{...data,organisationId:org,productId}});await tx.auditLog.create({data:{organisationId:org,actorUserId:req.organisationMembership!.userId,entityType:c.entity,entityId:row.id,action:'CREATED',after:row as Prisma.InputJsonValue}});return kind==='stakeholders'?{...row,title:row.name,status:row.engagement}:row;});}
 @Patch(':kind/:id') async update(@Req() req:AuthenticatedRequest,@Param('productId') productId:string,@Param('kind') kind:string,@Param('id') id:string,@Body() body:any){assertCanWrite(req);const c=this.config(kind);const org=req.organisationMembership!.organisationId;const delegate=(this.prisma as any)[c.model];const before=await delegate.findFirst({where:{id,organisationId:org,productId}});if(!before)throw new NotFoundException(`${c.entity} not found.`);const data=this.clean(c,body,false);await this.assertInitiativeLink(data,productId,org);return this.prisma.$transaction(async tx=>{const row=await (tx as any)[c.model].update({where:{id},data});await tx.auditLog.create({data:{organisationId:org,actorUserId:req.organisationMembership!.userId,entityType:c.entity,entityId:id,action:'UPDATED',before:before as Prisma.InputJsonValue,after:row as Prisma.InputJsonValue}});return kind==='stakeholders'?{...row,title:row.name,status:row.engagement}:row;});}
 private config(kind:string){if(!(kind in CONFIG))throw new NotFoundException('Register not found.');return CONFIG[kind as Kind];}
 private async assertProduct(productId:string,org:string){const p=await this.prisma.product.findFirst({where:{id:productId,organisationId:org},select:{id:true}});if(!p)throw new NotFoundException('Product not found.');}
 private async assertInitiativeLink(data:Record<string,unknown>,productId:string,org:string){if(typeof data.initiativeId!=='string'||!data.initiativeId)return;const i=await this.prisma.initiative.findFirst({where:{id:data.initiativeId,productId,organisationId:org},select:{id:true}});if(!i)throw new BadRequestException('Choose an initiative in the same product and organisation.');}
 private clean(config:(typeof CONFIG)[Kind],body:any,creating:boolean){if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('A record body is required.');const data:Record<string,unknown>={};for(const field of config.fields){if(!(field in body))continue;const value=body[field];if(field==='status'||field==='engagement'||field==='severity'){const allowed=field==='severity'?['LOW','MEDIUM','HIGH','CRITICAL']:field==='engagement'?['UNAWARE','RESISTANT','NEUTRAL','SUPPORTIVE','LEADING']:config.statuses;if(!(allowed as unknown[]).includes(value))throw new BadRequestException(`Invalid ${field}.`);data[field]=value;continue;}if(['probability','impact','influence'].includes(field)){if(!Number.isInteger(value)||value<1||value>5)throw new BadRequestException(`${field} must be an integer from 1 to 5.`);data[field]=value;continue;}if(['decidedAt','reviewDate','neededBy','dueAt','reviewedAt'].includes(field)){if(value===null||value===''){data[field]=null;continue;}if(typeof value!=='string'||Number.isNaN(Date.parse(value)))throw new BadRequestException(`${field} must be a valid date.`);data[field]=new Date(value);continue;}if(field==='options'){if(!Array.isArray(value)||value.length>20||value.some(x=>typeof x!=='string'||x.length>500))throw new BadRequestException('options must be an array of up to 20 text options.');data[field]=value.map(x=>x.trim());continue;}if(value===null&&['ownerLabel','initiativeId'].includes(field)){data[field]=null;continue;}if(typeof value!=='string')throw new BadRequestException(`${field} must be text.`);const max=['title','name'].includes(field)?180:field==='ownerLabel'?160:field==='initiativeId'?64:5000;if(value.length>max||(['title','name'].includes(field)&&!value.trim()))throw new BadRequestException(`Invalid ${field}; maximum ${max} characters.`);data[field]=value.trim();}if(creating&&!('title'in data)&&!('name'in data))throw new BadRequestException('A title or stakeholder name is required.');return data;}
}

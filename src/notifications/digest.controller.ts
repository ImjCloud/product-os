import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedRequest, OrganisationGuard } from '../auth/organisation.guard';
import { assertCanWrite } from '../auth/roles';
@Controller()
@UseGuards(OrganisationGuard)
export class DigestController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('products/:productId/digest-snapshots') async list(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) { const org=req.organisationMembership!.organisationId; const product=await this.prisma.product.findFirst({where:{id:productId,organisationId:org},select:{id:true}}); if(!product) throw new NotFoundException('Product not found.'); return this.prisma.digestSnapshot.findMany({where:{organisationId:org,productId},orderBy:{createdAt:'desc'},take:30}); }
  @Post('products/:productId/digest-snapshots') async create(@Req() req: AuthenticatedRequest, @Param('productId') productId: string, @Body() body: any) { assertCanWrite(req); const org=req.organisationMembership!.organisationId; const product=await this.prisma.product.findFirst({where:{id:productId,organisationId:org},select:{id:true}}); if(!product) throw new NotFoundException('Product not found.'); if(!body?.summary || typeof body.summary!=='object' || Array.isArray(body.summary)) throw new BadRequestException('A digest summary object is required.'); const snapshot=await this.prisma.digestSnapshot.create({data:{organisationId:org,productId,title:String(body.title||'Weekly product digest').slice(0,160),summary:body.summary as Prisma.InputJsonValue,createdById:req.organisationMembership!.userId}}); await this.prisma.auditLog.create({data:{organisationId:org,actorUserId:req.organisationMembership!.userId,entityType:'DigestSnapshot',entityId:snapshot.id,action:'CREATED',after:{title:snapshot.title,productId} as Prisma.InputJsonValue}}); return snapshot; }
}

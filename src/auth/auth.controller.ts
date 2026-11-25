import { Body, Controller, Post, BadRequestException, Get, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { BearerAuthGuard } from './bearer-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedRequest } from './organisation.guard';
const registerSchema = z.object({ email: z.string().email().max(254), password: z.string().min(12).max(128), name: z.string().trim().min(1).max(120).optional() });
const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(128) });
const linkSchema = z.object({ entraAccessToken: z.string().min(100).max(12000) }).strict();
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private prisma: PrismaService) {}
  @Post('register') register(@Body() body: unknown) { const parsed = registerSchema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten()); return this.auth.register(parsed.data); }
  @Post('login') login(@Body() body: unknown) { const parsed = loginSchema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten()); return this.auth.login(parsed.data); }
  @Get('me') @UseGuards(BearerAuthGuard) async me(@Req() req: AuthenticatedRequest) { return this.prisma.user.findUnique({ where: { id: req.user!.sub! }, select: { id: true, email: true, name: true, createdAt: true } }); }
  @Post('login/microsoft') loginMicrosoft(@Body() body: unknown) { const parsed = linkSchema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten()); return this.auth.loginMicrosoft(parsed.data.entraAccessToken); }
  @Post('link/microsoft') @UseGuards(BearerAuthGuard) linkMicrosoft(@Req() req: AuthenticatedRequest, @Body() body: unknown) { const parsed = linkSchema.safeParse(body); if (!parsed.success) throw new BadRequestException(parsed.error.flatten()); return this.auth.linkMicrosoft(req.user!.sub!, parsed.data.entraAccessToken); }
}

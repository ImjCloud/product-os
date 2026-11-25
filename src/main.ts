import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AuthRateLimiter } from './auth/auth-rate-limit';
import { validateRuntimeConfiguration } from './configuration';

async function bootstrap() {
  validateRuntimeConfiguration();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.setGlobalPrefix('api');
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '10mb' });
  const authRateLimiter = new AuthRateLimiter();
  app.use((req: any, res: any, next: () => void) => authRateLimiter.handle(req, res, next));
  app.enableShutdownHooks();
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3001').split(',').map(value => value.trim()).filter(Boolean),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organisation-Id'],
    credentials: false,
    maxAge: 600,
  });
  app.use((_req: any, res: any, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
}
void bootstrap();

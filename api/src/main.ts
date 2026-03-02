import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error', 'debug', 'verbose'] });

  // Security headers — same CSP directives as server.js
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://pagead2.googlesyndication.com', 'https://unpkg.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.geoapify.com'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow AdSense iframes
    }),
  );

  // CORS — same logic as server.js: if ALLOWED_ORIGIN set, restrict to that; otherwise allow same-origin
  const allowedOrigin = process.env.ALLOWED_ORIGIN || null;
  app.enableCors({
    origin: (origin, cb) => {
      // Allow requests with no origin (same-origin browser requests, curl during dev)
      if (!origin) return cb(null, true);
      if (!allowedOrigin || origin === allowedOrigin) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-agent-key'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = parseInt(process.env.PORT, 10) || 3000;
  await app.listen(port);
  logger.log(`Masaravie API listening on http://localhost:${port}`);
}

bootstrap();

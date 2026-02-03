// Sentry must be imported FIRST for instrumentation to work
import './instrument';

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import { validateEnvironment } from './config/env.validation';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  // Validate environment before starting
  validateEnvironment();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files (logos, public uploads)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Global API prefix
  app.setGlobalPrefix('api');

  // ============================================
  // SWAGGER / OPENAPI DOCUMENTATION
  // ============================================
  const config = new DocumentBuilder()
    .setTitle('MedLab API')
    .setDescription(`
## API de la Plateforme MedLab

Documentation complète de l'API REST pour les intégrations **LIS (Laboratory Information System)** et **HL7**.

### Authentification
Toutes les routes protégées nécessitent un token JWT Bearer.

### Modules Principaux
- **Auth** - Authentification et gestion des tokens
- **Results** - Envoi et gestion des résultats de laboratoire
- **Tenants** - Gestion multi-laboratoire
- **Integration** - API pour systèmes externes (LIS, HL7)
- **Sync** - Synchronisation Windows/Desktop

### Contact
Pour questions d'intégration: support@medlab.cm
    `)
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Results', 'Medical results management')
    .addTag('Tenants', 'Multi-tenant laboratory management')
    .addTag('Integration', 'External system integrations (LIS/HL7)')
    .addTag('Sync', 'Windows desktop synchronization')
    .addTag('Stats', 'Analytics and statistics')
    .addTag('OCR', 'OCR configuration for PDF extraction')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'MedLab API Documentation',
  });

  console.log('📚 Swagger documentation available at /api/docs');

  // Global Exception Filter (Prisma errors → proper HTTP codes)
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // ============================================
  // SECURITY: Helmet - Secure HTTP Headers
  // ============================================
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for UI
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for PDF viewing
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }));

  // ============================================
  // SECURITY: Strict CORS Configuration
  // ============================================
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174']; // Dev defaults

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS blocked request from: ${origin}`);
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const env = process.env.NODE_ENV || 'development';
  console.log(`🚀 Application running on port ${port} [${env.toUpperCase()}]`);

  if (env !== 'production') {
    console.log(`🔓 CORS allowed origins: ${allowedOrigins.join(', ')}`);
  }
}
bootstrap();

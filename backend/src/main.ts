// Sentry must be imported FIRST for instrumentation to work
import './instrument';

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
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
  // SECURITY: Cookie Parser (for httpOnly JWT cookies)
  // ============================================
  app.use(cookieParser());

  // ============================================
  // SWAGGER / OPENAPI DOCUMENTATION
  // ============================================
  const config = new DocumentBuilder()
    .setTitle('MedLab Public API')
    .setDescription(`
## MedLab Platform API — v2.0

Comprehensive REST API for the **MedLab** multi-tenant SaaS laboratory management platform.

### 🔐 Authentication
All protected routes require a **JWT Bearer token** obtained via \`POST /api/auth/login\`.

### 📚 API Modules
| Module | Description |
|--------|-------------|
| **Auth** | User authentication, password reset, SSO/LDAP |
| **Tenants** | Multi-tenant laboratory management, branding, plans |
| **Users Management** | CRUD operations for platform users |
| **Reporting** | Custom report generation with branding |
| **Integration** | External system integrations (LIS, HL7) |
| **Sync** | Windows desktop synchronization agent |
| **Health** | Platform health checks and monitoring |
| **Signatures** | Electronic document signing |

### 🌐 Base URL
- **Production**: \`https://api.medlab.cm/api\`
- **Staging**: \`https://staging.medlab.cm/api\`
- **Local**: \`http://localhost:3005/api\`

### 📧 Contact
For integration questions: **support@medlab.cm**
    `)
    .setVersion('2.0')
    .setContact('MedLab Support', 'https://medlab.cm', 'support@medlab.cm')
    .setLicense('Proprietary', 'https://medlab.cm/legal/terms')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token obtained from POST /api/auth/login',
        in: 'header',
      },
      'JWT-auth'
    )
    .addTag('Auth', 'Authentication, password reset, and SSO/LDAP endpoints')
    .addTag('Tenants', 'Multi-tenant laboratory management, branding, licensing, and plan management')
    .addTag('Users Management', 'CRUD operations for platform users (Super Admin only)')
    .addTag('Reporting', 'Custom report generation with optional branding')
    .addTag('Integration', 'External system integrations (LIS, HL7 message processing)')
    .addTag('Sync', 'Windows desktop synchronization agent API')
    .addTag('Health', 'Platform health checks and readiness probes')
    .addTag('Signatures', 'Electronic document signing and verification')
    .addTag('Results', 'Medical results upload and delivery')
    .addTag('Stats', 'Analytics, BI dashboards, and statistics')
    .addTag('OCR', 'OCR configuration for PDF data extraction')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'MedLab API Documentation',
    customfavIcon: '/api/favicon.ico',
    customCss: `
      .swagger-ui .topbar { background-color: #1e293b; }
      .swagger-ui .topbar .link { color: #f8fafc; }
      .swagger-ui .info .title { color: #1e293b; }
      .swagger-ui .btn.authorize { background-color: #2563eb; border-color: #2563eb; color: #fff; }
      .swagger-ui .btn.authorize svg { fill: #fff; }
    `,
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

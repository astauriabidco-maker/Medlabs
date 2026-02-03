/**
 * Results E2E Tests
 * Tests results upload and retrieval endpoints
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs';

describe('Results (e2e)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let authToken: string;
    let testTenantId: string;
    let testUserId: string;

    // Create minimal valid PDF buffer
    const createPdfBuffer = (): Buffer => {
        const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
196
%%EOF`;
        return Buffer.from(pdfContent);
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();

        prisma = app.get<PrismaService>(PrismaService);

        // Create test tenant
        const tenant = await prisma.tenant.upsert({
            where: { slug: 'e2e-results-lab' },
            create: {
                name: 'E2E Results Lab',
                slug: 'e2e-results-lab',
            },
            update: {},
        });
        testTenantId = tenant.id;

        // Create test user
        const passwordHash = await bcrypt.hash('TestPassword123!', 10);
        const user = await prisma.user.upsert({
            where: { email: 'e2e-results@medlab.cm' },
            create: {
                email: 'e2e-results@medlab.cm',
                passwordHash,
                firstName: 'E2E',
                lastName: 'Results User',
                role: 'TECHNICIAN',
                tenantId: testTenantId,
            },
            update: { passwordHash },
        });
        testUserId = user.id;

        // Get auth token
        const loginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: 'e2e-results@medlab.cm',
                password: 'TestPassword123!',
            });
        authToken = loginResponse.body.access_token;
    });

    afterAll(async () => {
        // Cleanup
        await prisma.document.deleteMany({ where: { tenantId: testTenantId } });
        await prisma.user.deleteMany({ where: { email: 'e2e-results@medlab.cm' } });
        await prisma.tenant.deleteMany({ where: { slug: 'e2e-results-lab' } });
        await app.close();
    });

    describe('POST /results', () => {
        it('should upload PDF result successfully', async () => {
            const response = await request(app.getHttpServer())
                .post('/results')
                .set('Authorization', `Bearer ${authToken}`)
                .field('folderRef', 'E2E-2024-001')
                .field('patientPhone', '+237612345678')
                .field('patientName', 'Jean Test')
                .field('patientDob', '1990-01-15')
                .attach('file', createPdfBuffer(), 'result.pdf')
                .expect(201);

            expect(response.body).toHaveProperty('documentId');
            expect(response.body).toHaveProperty('accessCode');
            expect(response.body.message).toContain('uploaded');
        });

        it('should reject duplicate folderRef', async () => {
            // First upload
            await request(app.getHttpServer())
                .post('/results')
                .set('Authorization', `Bearer ${authToken}`)
                .field('folderRef', 'E2E-DUP-001')
                .field('patientPhone', '+237612345678')
                .field('patientName', 'Jean Test')
                .field('patientDob', '1990-01-15')
                .attach('file', createPdfBuffer(), 'result.pdf')
                .expect(201);

            // Duplicate attempt
            await request(app.getHttpServer())
                .post('/results')
                .set('Authorization', `Bearer ${authToken}`)
                .field('folderRef', 'E2E-DUP-001')
                .field('patientPhone', '+237699999999')
                .field('patientName', 'Another Patient')
                .field('patientDob', '1985-05-20')
                .attach('file', createPdfBuffer(), 'result2.pdf')
                .expect(409);
        });

        it('should reject non-PDF files', async () => {
            await request(app.getHttpServer())
                .post('/results')
                .set('Authorization', `Bearer ${authToken}`)
                .field('folderRef', 'E2E-TXT-001')
                .field('patientPhone', '+237612345678')
                .field('patientName', 'Jean Test')
                .field('patientDob', '1990-01-15')
                .attach('file', Buffer.from('not a pdf'), { filename: 'result.pdf', contentType: 'application/pdf' })
                .expect(400);
        });

        it('should require authentication', async () => {
            await request(app.getHttpServer())
                .post('/results')
                .field('folderRef', 'E2E-NOAUTH-001')
                .field('patientPhone', '+237612345678')
                .field('patientName', 'Jean Test')
                .field('patientDob', '1990-01-15')
                .attach('file', createPdfBuffer(), 'result.pdf')
                .expect(401);
        });
    });

    describe('GET /results', () => {
        it('should return paginated results', async () => {
            const response = await request(app.getHttpServer())
                .get('/results')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('meta');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should filter by search term', async () => {
            const response = await request(app.getHttpServer())
                .get('/results?search=Jean')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.data.every((r: any) =>
                r.patientName?.toLowerCase().includes('jean') ||
                r.patientFirstName?.toLowerCase().includes('jean')
            )).toBe(true);
        });

        it('should require authentication', async () => {
            await request(app.getHttpServer())
                .get('/results')
                .expect(401);
        });
    });

    describe('GET /results/:id/preview', () => {
        let testDocId: string;

        beforeAll(async () => {
            // Create a document for preview testing
            const response = await request(app.getHttpServer())
                .post('/results')
                .set('Authorization', `Bearer ${authToken}`)
                .field('folderRef', 'E2E-PREVIEW-001')
                .field('patientPhone', '+237612345678')
                .field('patientName', 'Preview Test')
                .field('patientDob', '1990-01-15')
                .attach('file', createPdfBuffer(), 'result.pdf');
            testDocId = response.body.documentId;
        });

        it('should return presigned URL for document', async () => {
            const response = await request(app.getHttpServer())
                .get(`/results/${testDocId}/preview`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('url');
        });

        it('should return 404 for non-existent document', async () => {
            await request(app.getHttpServer())
                .get('/results/nonexistent-id/preview')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
    });
});

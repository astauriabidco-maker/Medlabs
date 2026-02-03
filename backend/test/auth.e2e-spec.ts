/**
 * Auth E2E Tests
 * Tests authentication endpoints with real HTTP requests
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Auth (e2e)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;

    // Test user data
    const testUser = {
        email: 'e2e-test@medlab.cm',
        password: 'TestPassword123!',
        firstName: 'E2E',
        lastName: 'Test User',
    };
    let testUserId: string;
    let testTenantId: string;

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
            where: { slug: 'e2e-test-lab' },
            create: {
                name: 'E2E Test Lab',
                slug: 'e2e-test-lab',
            },
            update: {},
        });
        testTenantId = tenant.id;

        // Create test user
        const passwordHash = await bcrypt.hash(testUser.password, 10);
        const user = await prisma.user.upsert({
            where: { email: testUser.email },
            create: {
                email: testUser.email,
                passwordHash,
                firstName: testUser.firstName,
                lastName: testUser.lastName,
                role: 'LAB_ADMIN',
                tenantId: testTenantId,
            },
            update: { passwordHash },
        });
        testUserId = user.id;
    });

    afterAll(async () => {
        // Cleanup test data
        await prisma.user.deleteMany({ where: { email: testUser.email } });
        await prisma.tenant.deleteMany({ where: { slug: 'e2e-test-lab' } });
        await app.close();
    });

    describe('POST /auth/login', () => {
        it('should return JWT token for valid credentials', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                })
                .expect(201);

            expect(response.body).toHaveProperty('access_token');
            expect(response.body.user).toHaveProperty('email', testUser.email);
            expect(response.body.user).not.toHaveProperty('passwordHash');
        });

        it('should return 401 for invalid password', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: testUser.email,
                    password: 'WrongPassword!',
                })
                .expect(401);
        });

        it('should return 401 for non-existent user', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: 'nonexistent@medlab.cm',
                    password: 'AnyPassword123!',
                })
                .expect(401);
        });

        it('should validate email format', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: 'invalid-email',
                    password: 'Password123!',
                })
                .expect(400);
        });
    });

    describe('GET /auth/profile', () => {
        let authToken: string;

        beforeAll(async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });
            authToken = response.body.access_token;
        });

        it('should return user profile with valid token', async () => {
            const response = await request(app.getHttpServer())
                .get('/auth/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('email', testUser.email);
            expect(response.body).toHaveProperty('firstName', testUser.firstName);
        });

        it('should return 401 without token', async () => {
            await request(app.getHttpServer())
                .get('/auth/profile')
                .expect(401);
        });

        it('should return 401 with invalid token', async () => {
            await request(app.getHttpServer())
                .get('/auth/profile')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });
    });

    describe('POST /auth/password-reset/request', () => {
        it('should return success message for existing user', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/password-reset/request')
                .send({ email: testUser.email })
                .expect(201);

            expect(response.body.message).toContain('If an account exists');
        });

        it('should return same message for non-existent user (security)', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/password-reset/request')
                .send({ email: 'nonexistent@medlab.cm' })
                .expect(201);

            expect(response.body.message).toContain('If an account exists');
        });
    });
});

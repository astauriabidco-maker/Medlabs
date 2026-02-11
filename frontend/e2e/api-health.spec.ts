/**
 * E2E Tests — API Health & Critical Endpoints
 *
 * Tests: Health check, Swagger docs, API response format
 */
import { test, expect } from '@playwright/test';

const API_BASE = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3005';

test.describe('API Health & Documentation', () => {
    // No browser auth needed for these tests
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should return healthy status', async ({ request }) => {
        const response = await request.get(`${API_BASE}/api/health`);
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body).toHaveProperty('status');
        expect(body.status).toMatch(/ok|healthy|up/i);
    });

    test('should serve Swagger documentation', async ({ request }) => {
        const response = await request.get(`${API_BASE}/api/docs`);
        expect(response.status()).toBe(200);

        const html = await response.text();
        expect(html).toContain('swagger');
    });

    test('should serve OpenAPI JSON spec', async ({ request }) => {
        const response = await request.get(`${API_BASE}/api/docs-json`);
        expect(response.status()).toBe(200);

        const spec = await response.json();
        expect(spec).toHaveProperty('openapi');
        expect(spec).toHaveProperty('info');
        expect(spec.info.title).toContain('MedLab');
    });

    test('should reject unauthenticated API requests', async ({ request }) => {
        const response = await request.get(`${API_BASE}/api/tenants`);
        expect(response.status()).toBe(401);
    });

    test('should authenticate and return token', async ({ request }) => {
        const response = await request.post(`${API_BASE}/api/auth/login`, {
            data: {
                email: 'admin@medlab.cm',
                password: 'pass123',
            },
        });
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body).toHaveProperty('access_token');
        expect(body).toHaveProperty('user');
        expect(body.user.email).toBe('admin@medlab.cm');
    });

    test('should access protected endpoint with valid token', async ({ request }) => {
        // Login
        const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
            data: { email: 'admin@medlab.cm', password: 'pass123' },
        });
        const { access_token } = await loginResponse.json();

        // Access protected endpoint
        const tenantsResponse = await request.get(`${API_BASE}/api/tenants`, {
            headers: { Authorization: `Bearer ${access_token}` },
        });
        expect(tenantsResponse.status()).toBe(200);

        const tenants = await tenantsResponse.json();
        expect(Array.isArray(tenants)).toBeTruthy();
        expect(tenants.length).toBeGreaterThanOrEqual(1);
    });
});

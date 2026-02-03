/**
 * Common Test Mocks Index
 * Exports all mock factories for easy importing in tests
 */

export * from './prisma.mock';
export * from './cache.mock';

/**
 * Mock JwtService for authentication testing
 */
export const createMockJwtService = () => ({
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn().mockReturnValue({ sub: 'user-id', email: 'test@test.com' }),
    decode: jest.fn().mockReturnValue({ sub: 'user-id', email: 'test@test.com' }),
});

/**
 * Mock EmailService
 */
export const createMockEmailService = () => ({
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    sendAccessCode: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
});

/**
 * Mock AuditService
 */
export const createMockAuditService = () => ({
    log: jest.fn().mockResolvedValue(undefined),
    logLogin: jest.fn().mockResolvedValue(undefined),
    logImpersonation: jest.fn().mockResolvedValue(undefined),
    logDataAccess: jest.fn().mockResolvedValue(undefined),
});

/**
 * Test User Factory
 */
export const createTestUser = (overrides: Record<string, any> = {}) => ({
    id: 'user-123',
    email: 'test@medlab.cm',
    passwordHash: '$2b$10$hashedpassword',
    role: 'TECHNICIAN',
    tenantId: 'tenant-456',
    name: 'Test User',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    customRoleId: null,
    ...overrides,
});

/**
 * Test Tenant Factory
 */
export const createTestTenant = (overrides: Record<string, any> = {}) => ({
    id: 'tenant-456',
    name: 'Test Lab',
    slug: 'test-lab',
    isActive: true,
    plan: 'PRO',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

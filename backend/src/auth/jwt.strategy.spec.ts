import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-chars';
  });

  it('keeps impersonation claims on request user', async () => {
    const strategy = new JwtStrategy();

    await expect(
      strategy.validate({
        sub: 'target-user',
        email: 'target@medlab.cm',
        role: 'LAB_ADMIN',
        tenantId: 'tenant-123',
        customRoleId: null,
        isImpersonated: true,
        originalAdminId: 'admin-123',
      }),
    ).resolves.toEqual({
      id: 'target-user',
      email: 'target@medlab.cm',
      role: 'LAB_ADMIN',
      tenantId: 'tenant-123',
      customRoleId: null,
      isImpersonated: true,
      originalAdminId: 'admin-123',
    });
  });
});

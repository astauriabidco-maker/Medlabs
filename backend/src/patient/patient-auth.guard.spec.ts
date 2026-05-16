import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PatientAuthGuard } from './patient-auth.guard';

const createContext = (request: Record<string, any>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as ExecutionContext;

describe('PatientAuthGuard', () => {
  let guard: PatientAuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let originalPatientSecret: string | undefined;

  beforeEach(() => {
    originalPatientSecret = process.env.PATIENT_JWT_SECRET;
    process.env.PATIENT_JWT_SECRET =
      'test-patient-secret-with-at-least-32-chars';
    jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        phone: '+237612345678',
        tenantId: 'tenant-456',
        role: 'PATIENT',
        type: 'patient',
      }),
    };
    guard = new PatientAuthGuard(jwtService as unknown as JwtService);
  });

  afterEach(() => {
    if (originalPatientSecret === undefined) {
      delete process.env.PATIENT_JWT_SECRET;
    } else {
      process.env.PATIENT_JWT_SECRET = originalPatientSecret;
    }
    jest.clearAllMocks();
  });

  it('accepts a signed patient token from the httpOnly cookie before Bearer auth', async () => {
    const request = {
      cookies: { patient_access_token: 'cookie-patient-token' },
      headers: { authorization: 'Bearer bearer-patient-token' },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith(
      'cookie-patient-token',
      {
        secret: 'test-patient-secret-with-at-least-32-chars',
      },
    );
    expect(request).toMatchObject({
      patient: {
        phone: '+237612345678',
        tenantId: 'tenant-456',
      },
    });
  });

  it('falls back to a Bearer token when no patient cookie exists', async () => {
    const request = {
      cookies: {},
      headers: { authorization: 'Bearer bearer-patient-token' },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith(
      'bearer-patient-token',
      {
        secret: 'test-patient-secret-with-at-least-32-chars',
      },
    );
  });

  it('rejects tokens without patient claims', async () => {
    jwtService.verifyAsync.mockResolvedValueOnce({
      phone: '+237612345678',
      tenantId: 'tenant-456',
      role: 'LAB_ADMIN',
      type: 'user',
    });

    await expect(
      guard.canActivate(
        createContext({
          cookies: { patient_access_token: 'admin-token' },
          headers: {},
        }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
});

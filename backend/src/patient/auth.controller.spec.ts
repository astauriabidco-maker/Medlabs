import type { Response } from 'express';
import { PatientAuthController } from './auth.controller';
import { PatientAuthService } from './auth.service';

describe('PatientAuthController', () => {
  let controller: PatientAuthController;
  let authService: Pick<PatientAuthService, 'verifyOtp' | 'requestOtp'>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.AUTH_COOKIE_DOMAIN;
    delete process.env.AUTH_COOKIE_SECURE;
    delete process.env.AUTH_COOKIE_SAMESITE;
    process.env.NODE_ENV = 'test';

    authService = {
      requestOtp: jest.fn(),
      verifyOtp: jest.fn().mockResolvedValue({
        token: 'signed-patient-token',
        expiresIn: 24 * 60 * 60,
      }),
    };
    controller = new PatientAuthController(authService as PatientAuthService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('sets an httpOnly patient cookie on verify-otp scoped to /api/patient', async () => {
    const cookie = jest.fn();
    const res = {
      cookie,
    } as unknown as Response;

    const result = await controller.verifyOtp(
      'lab-slug',
      { phoneNumber: '+237612345678', code: '1234' },
      res,
    );

    expect(authService.verifyOtp).toHaveBeenCalledWith(
      '+237612345678',
      '1234',
      'lab-slug',
    );
    expect(cookie).toHaveBeenCalledWith(
      'patient_access_token',
      'signed-patient-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/api/patient',
        maxAge: 24 * 60 * 60 * 1000,
      }),
    );
    expect(result).toEqual({
      token: 'signed-patient-token',
      expiresIn: 24 * 60 * 60,
    });
  });

  it('clears the patient cookie on logout with the patient API path', () => {
    const clearCookie = jest.fn();
    const res = {
      clearCookie,
    } as unknown as Response;

    expect(controller.logout(res)).toEqual({
      message: 'Logged out successfully',
    });
    expect(clearCookie).toHaveBeenCalledWith(
      'patient_access_token',
      expect.objectContaining({
        httpOnly: true,
        path: '/api/patient',
      }),
    );
  });
});

import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { getAuthCookieOptions } from '../auth/cookie-options';
import { PatientAuthService } from './auth.service';

class RequestOtpDto {
  phoneNumber: string;
}

class VerifyOtpDto {
  phoneNumber: string;
  code: string;
}

@Controller('patient/auth')
export class PatientAuthController {
  constructor(private readonly authService: PatientAuthService) {}

  /**
   * Request OTP for patient authentication
   * POST /api/patient/auth/request-otp/:tenantSlug
   */
  @Post('request-otp/:tenantSlug')
  @Throttle({ default: { limit: 5, ttl: 60_000, blockDuration: 10 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  async requestOtp(
    @Param('tenantSlug') tenantSlug: string,
    @Body() dto: RequestOtpDto,
  ): Promise<{ success: boolean; message: string }> {
    // We need to resolve tenant ID from slug
    // For now, we'll accept tenantId directly in the body as well
    // In production, resolve from slug
    return this.authService.requestOtp(dto.phoneNumber, tenantSlug);
  }

  /**
   * Verify OTP and get patient token
   * POST /api/patient/auth/verify-otp/:tenantSlug
   */
  @Post('verify-otp/:tenantSlug')
  @Throttle({ default: { limit: 10, ttl: 60_000, blockDuration: 10 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Param('tenantSlug') tenantSlug: string,
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ token: string; expiresIn: number }> {
    const result = await this.authService.verifyOtp(
      dto.phoneNumber,
      dto.code,
      tenantSlug,
    );
    res.cookie(
      'patient_access_token',
      result.token,
      getAuthCookieOptions(result.expiresIn * 1000, '/api/patient'),
    );
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(
      'patient_access_token',
      getAuthCookieOptions(undefined, '/api/patient'),
    );
    return { message: 'Logged out successfully' };
  }
}

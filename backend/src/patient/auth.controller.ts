import { Controller, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
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
    constructor(private readonly authService: PatientAuthService) { }

    /**
     * Request OTP for patient authentication
     * POST /api/patient/auth/request-otp/:tenantSlug
     */
    @Post('request-otp/:tenantSlug')
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
    @HttpCode(HttpStatus.OK)
    async verifyOtp(
        @Param('tenantSlug') tenantSlug: string,
        @Body() dto: VerifyOtpDto,
    ): Promise<{ token: string; expiresIn: number }> {
        return this.authService.verifyOtp(dto.phoneNumber, dto.code, tenantSlug);
    }
}

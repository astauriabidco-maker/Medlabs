import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { DynamicNotificationService } from '../notifications/dynamic-notification.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PatientAuthService {
    private readonly logger = new Logger(PatientAuthService.name);
    private readonly OTP_EXPIRY_MINUTES = 5;
    private readonly MAX_ATTEMPTS = 5;
    private readonly RATE_LIMIT_MINUTES = 10;
    private readonly MAX_REQUESTS_PER_WINDOW = 3;

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly notificationService: DynamicNotificationService,
    ) { }

    /**
     * Request OTP - Generate 4-digit code, hash, store, and send via SMS/WhatsApp
     */
    async requestOtp(phoneNumber: string, tenantId: string): Promise<{ success: boolean; message: string }> {
        // Normalize phone number
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

        // Rate limiting check
        const rateLimitWindow = new Date(Date.now() - this.RATE_LIMIT_MINUTES * 60 * 1000);
        const recentRequests = await this.prisma.patientSession.count({
            where: {
                phoneNumber: normalizedPhone,
                tenantId,
                createdAt: { gte: rateLimitWindow },
            },
        });

        if (recentRequests >= this.MAX_REQUESTS_PER_WINDOW) {
            throw new BadRequestException(
                `Trop de demandes. Veuillez attendre ${this.RATE_LIMIT_MINUTES} minutes.`
            );
        }

        // Generate 4-digit OTP
        const otpCode = this.generateOtp();
        const otpHash = await bcrypt.hash(otpCode, 10);

        // Calculate expiry
        const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

        // Delete any existing sessions for this phone/tenant
        await this.prisma.patientSession.deleteMany({
            where: {
                phoneNumber: normalizedPhone,
                tenantId,
            },
        });

        // Create new session
        await this.prisma.patientSession.create({
            data: {
                phoneNumber: normalizedPhone,
                tenantId,
                otpHash,
                expiresAt,
            },
        });

        // Send OTP via notification service
        const message = `MedLab: Votre code de connexion est ${otpCode}. Valide ${this.OTP_EXPIRY_MINUTES} minutes.`;

        try {
            // Try WhatsApp first, then SMS fallback
            const result = await this.notificationService.sendWhatsApp(tenantId, normalizedPhone, message);

            if (!result.success) {
                // Fallback to SMS
                const smsResult = await this.notificationService.sendSms(tenantId, normalizedPhone, message);
                if (!smsResult.success) {
                    this.logger.warn(`Failed to send OTP to ${normalizedPhone}: ${smsResult.error}`);
                    // Still return success to not leak info about phone validity
                }
            }
        } catch (error) {
            this.logger.error(`Error sending OTP: ${error.message}`);
            // Still return success to not leak info
        }

        this.logger.log(`OTP requested for ${normalizedPhone.slice(-4)} on tenant ${tenantId}`);

        return {
            success: true,
            message: 'Code envoyé par SMS/WhatsApp',
        };
    }

    /**
     * Verify OTP and return Patient JWT
     */
    async verifyOtp(
        phoneNumber: string,
        code: string,
        tenantId: string,
    ): Promise<{ token: string; expiresIn: number }> {
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

        // Find session
        const session = await this.prisma.patientSession.findFirst({
            where: {
                phoneNumber: normalizedPhone,
                tenantId,
                verified: false,
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!session) {
            throw new UnauthorizedException('Session expirée. Veuillez redemander un code.');
        }

        // Check expiry
        if (new Date() > session.expiresAt) {
            await this.prisma.patientSession.delete({ where: { id: session.id } });
            throw new UnauthorizedException('Code expiré. Veuillez redemander un code.');
        }

        // Check attempts
        if (session.attempts >= this.MAX_ATTEMPTS) {
            await this.prisma.patientSession.delete({ where: { id: session.id } });
            throw new UnauthorizedException('Trop de tentatives. Veuillez redemander un code.');
        }

        // Verify code
        const isValid = await bcrypt.compare(code, session.otpHash);

        if (!isValid) {
            // Increment attempts
            await this.prisma.patientSession.update({
                where: { id: session.id },
                data: { attempts: { increment: 1 } },
            });
            throw new UnauthorizedException('Code incorrect.');
        }

        // Mark as verified
        await this.prisma.patientSession.update({
            where: { id: session.id },
            data: { verified: true },
        });

        // Generate Patient JWT (different from admin JWT)
        const payload = {
            phone: normalizedPhone,
            role: 'PATIENT',
            tenantId,
            type: 'patient', // Differentiator from admin tokens
        };

        const expiresIn = 24 * 60 * 60; // 24 hours
        const token = this.jwtService.sign(payload, { expiresIn });

        this.logger.log(`Patient authenticated: ${normalizedPhone.slice(-4)} on tenant ${tenantId}`);

        return {
            token,
            expiresIn,
        };
    }

    /**
     * Generate 4-digit OTP
     */
    private generateOtp(): string {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    /**
     * Normalize phone number to E.164 format
     */
    private normalizePhoneNumber(phone: string): string {
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');

        // Add Cameroon country code if not present
        if (cleaned.startsWith('6') && cleaned.length === 9) {
            cleaned = '237' + cleaned;
        }

        // Ensure + prefix
        if (!cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }

        return cleaned;
    }
}

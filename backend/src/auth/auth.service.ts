
import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../notifications/email.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private emailService: EmailService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        console.log('Login Attempt:', email);
        const user = await this.prisma.user.findUnique({ where: { email } });
        console.log('User Found:', user ? 'Yes' : 'No');

        if (user) {
            const isMatch = await bcrypt.compare(pass, user.passwordHash);
            if (isMatch) {
                const { passwordHash, ...result } = user;
                return result;
            }
        }
        return null;
    }

    async login(user: any) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            customRoleId: user.customRoleId || null
        };
        return {
            access_token: this.jwtService.sign(payload, {
                secret: process.env.JWT_SECRET || 'dev_secret_key_123',
                expiresIn: '12h'
            }),
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId
            }
        };
    }

    async requestPasswordReset(email: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Return success even if user not found to prevent enumeration
            return { message: 'If an account exists, a reset link has been sent.' };
        }

        // In a real app, store this token in DB with expiry. 
        // For now, we'll verify the email matches the token subject if we use JWT, 
        // or store a random token.
        // Let's use a short lived JWT as the reset token.
        const resetToken = this.jwtService.sign(
            { sub: user.id, email: user.email, type: 'RESET_PASSWORD' },
            {
                secret: process.env.JWT_SECRET || 'dev_secret_key_123',
                expiresIn: '1h'
            }
        );

        // Send Email
        const resetLink = `${process.env.APP_BASE_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
        await this.emailService.sendPasswordReset(email, resetLink);

        return { message: 'If an account exists, a reset link has been sent.' };
    }

    async resetPassword(token: string, newPass: string) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET || 'dev_secret_key_123'
            });

            if (payload.type !== 'RESET_PASSWORD') {
                throw new BadRequestException('Invalid token type');
            }

            const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
            if (!user) throw new NotFoundException('User not found');

            const hash = await bcrypt.hash(newPass, 10);
            await this.prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: hash }
            });

            return { message: 'Password updated successfully' };

        } catch (e) {
            throw new BadRequestException('Invalid or expired token');
        }
    }

    async impersonate(targetUserId: string, originalAdminId: string) {
        // Target User
        const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
        if (!user) throw new NotFoundException('User not found');

        // Generate Token for this user with impersonation flag
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            customRoleId: user.customRoleId || null,
            isImpersonated: true,
            originalAdminId: originalAdminId, // Store for return functionality
        };

        return {
            access_token: this.jwtService.sign(payload, {
                secret: process.env.JWT_SECRET || 'dev_secret_key_123',
                expiresIn: '1h' // Short lived for security
            }),
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                isImpersonated: true,
            }
        };
    }

    async unimpersonate(originalAdminId: string) {
        // Get the original Super Admin
        const admin = await this.prisma.user.findUnique({ where: { id: originalAdminId } });
        if (!admin || admin.role !== 'SUPER_ADMIN') {
            throw new UnauthorizedException('Invalid admin');
        }

        // Generate fresh token for the Super Admin
        return this.login(admin);
    }
}

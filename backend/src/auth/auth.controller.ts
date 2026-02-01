
import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard, RolesGuard, Roles } from './guards';
// We can define DTOs here or separately. For brevity I'll define simple classes or check if standard ones exist.
// Let's assume standard validation is wanted, I'll inline DTOs or create a file if strict.
// For now, I'll use simple Body decorators with types.

export class RequestResetDto {
    email: string;
}

export class ResetPasswordDto {
    token: string;
    newPass: string;
}

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
        const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }

    @Post('request-password-reset')
    @HttpCode(HttpStatus.OK)
    async requestPasswordReset(@Body() body: RequestResetDto) {
        return this.authService.requestPasswordReset(body.email);
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.resetPassword(body.token, body.newPass);
    }

    @Post('impersonate')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async impersonate(@Body('userId') userId: string, @Request() req: any) {
        const originalAdminId = req.user.sub;
        return this.authService.impersonate(userId, originalAdminId);
    }

    @Post('unimpersonate')
    @UseGuards(JwtAuthGuard)
    async unimpersonate(@Request() req: any) {
        const originalAdminId = req.user.originalAdminId;
        if (!originalAdminId) {
            throw new UnauthorizedException('No impersonation session active');
        }
        return this.authService.unimpersonate(originalAdminId);
    }
}

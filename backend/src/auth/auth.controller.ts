
import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Authenticate user', description: 'Login with email and password. Returns a JWT access token for subsequent API calls.' })
    @ApiResponse({ status: 200, description: 'Login successful, returns JWT token and user info' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() loginDto: LoginDto) {
        const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }

    @Post('request-password-reset')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request password reset', description: 'Sends a password reset email to the user' })
    @ApiResponse({ status: 200, description: 'Reset email sent (even if email not found, for security)' })
    async requestPasswordReset(@Body() body: RequestResetDto) {
        return this.authService.requestPasswordReset(body.email);
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password', description: 'Reset the user password using a valid reset token' })
    @ApiResponse({ status: 200, description: 'Password reset successfully' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    async resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.resetPassword(body.token, body.newPass);
    }

    @Post('impersonate')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Impersonate a user', description: 'Super Admin can impersonate any user for debugging. Returns a new JWT token scoped to the target user.' })
    @ApiResponse({ status: 200, description: 'Impersonation token returned' })
    async impersonate(@Body('userId') userId: string, @Request() req: any) {
        const originalAdminId = req.user.sub;
        return this.authService.impersonate(userId, originalAdminId);
    }

    @Post('unimpersonate')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Stop impersonation', description: 'End the impersonation session and return to the Super Admin account' })
    @ApiResponse({ status: 200, description: 'Returned to original admin session' })
    async unimpersonate(@Request() req: any) {
        const originalAdminId = req.user.originalAdminId;
        if (!originalAdminId) {
            throw new UnauthorizedException('No impersonation session active');
        }
        return this.authService.unimpersonate(originalAdminId);
    }
}

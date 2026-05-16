import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard, RolesGuard, Roles } from './guards';
import { getAuthCookieOptions } from './cookie-options';

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
  constructor(private authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000, blockDuration: 5 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user',
    description:
      'Login with email and password. Returns a JWT access token as an httpOnly cookie and in the response body for API clients.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token and user info',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: any,
  ) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const result = await this.authService.login(user);

    // SECURITY: Set JWT in httpOnly cookie (browser-safe, XSS-immune)
    res.cookie('access_token', result.access_token, getAuthCookieOptions());

    // Also return in response body for API clients (mobile, Swagger, etc.)
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout',
    description: 'Clears the authentication cookie',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Res({ passthrough: true }) res: any) {
    // Clear the auth cookie
    res.clearCookie('access_token', getAuthCookieOptions());
    return { message: 'Logged out successfully' };
  }

  @Post('request-password-reset')
  @Throttle({ default: { limit: 3, ttl: 60_000, blockDuration: 10 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends a password reset email to the user',
  })
  @ApiResponse({
    status: 200,
    description: 'Reset email sent (even if email not found, for security)',
  })
  async requestPasswordReset(@Body() body: RequestResetDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000, blockDuration: 5 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset the user password using a valid reset token',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPass);
  }

  @Post('impersonate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Impersonate a user',
    description:
      'Super Admin can impersonate any user for debugging. Returns a new JWT token scoped to the target user.',
  })
  @ApiResponse({ status: 200, description: 'Impersonation token returned' })
  async impersonate(
    @Body('userId') userId: string,
    @Request() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const originalAdminId = req.user.id;
    const result = await this.authService.impersonate(userId, originalAdminId);

    // Set the impersonation token as cookie too
    res.cookie('access_token', result.access_token, {
      ...getAuthCookieOptions(),
      maxAge: 1 * 60 * 60 * 1000, // 1 hour for impersonation (shorter)
    });

    return result;
  }

  @Post('unimpersonate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Stop impersonation',
    description:
      'End the impersonation session and return to the Super Admin account',
  })
  @ApiResponse({
    status: 200,
    description: 'Returned to original admin session',
  })
  async unimpersonate(
    @Request() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const originalAdminId = req.user.originalAdminId;
    if (!originalAdminId) {
      throw new UnauthorizedException('No impersonation session active');
    }
    const result = await this.authService.unimpersonate(originalAdminId);

    // Set restored admin token as cookie
    res.cookie('access_token', result.access_token, getAuthCookieOptions());

    return result;
  }
}

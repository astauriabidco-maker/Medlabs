import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

/**
 * SECURITY: Custom JWT extraction that checks httpOnly cookie first, then Authorization header.
 * This allows browsers to use secure cookies while API clients (mobile, sync agent) use Bearer tokens.
 */
function cookieOrBearerExtractor(req: Request): string | null {
  // 1. Try httpOnly cookie first (most secure for browsers)
  if (req?.cookies?.access_token) {
    return req.cookies.access_token;
  }

  // 2. Fallback to Authorization Bearer header (for API clients, mobile apps, Swagger)
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const jwtSecret = process.env.JWT_SECRET;

    // SECURITY: Never use a fallback secret - fail hard if not configured
    if (!jwtSecret) {
      throw new Error(
        'CRITICAL: JWT_SECRET environment variable is not set. Application cannot start securely.',
      );
    }

    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      customRoleId: payload.customRoleId || null,
      isImpersonated: payload.isImpersonated || false,
      originalAdminId: payload.originalAdminId || null,
    };
  }
}

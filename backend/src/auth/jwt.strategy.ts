
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        const jwtSecret = process.env.JWT_SECRET;

        // SECURITY: Never use a fallback secret - fail hard if not configured
        if (!jwtSecret) {
            throw new Error('CRITICAL: JWT_SECRET environment variable is not set. Application cannot start securely.');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
            customRoleId: payload.customRoleId || null
        };
    }
}

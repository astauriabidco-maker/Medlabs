import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface PatientPayload {
    phone: string;
    role: 'PATIENT';
    tenantId: string;
    type: 'patient';
}

@Injectable()
export class PatientAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('Token manquant');
        }

        try {
            const payload = await this.jwtService.verifyAsync<PatientPayload>(token);

            // Verify this is a patient token, not an admin token
            if (payload.type !== 'patient' || payload.role !== 'PATIENT') {
                throw new UnauthorizedException('Token patient invalide');
            }

            // Attach patient info to request
            (request as any).patient = {
                phone: payload.phone,
                tenantId: payload.tenantId,
            };

            return true;
        } catch (error) {
            throw new UnauthorizedException('Token invalide ou expiré');
        }
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const authHeader = request.headers.authorization;
        if (!authHeader) return undefined;

        const [type, token] = authHeader.split(' ');
        return type === 'Bearer' ? token : undefined;
    }
}

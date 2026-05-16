import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface PatientPayload {
  phone: string;
  role: 'PATIENT';
  tenantId: string;
  type: 'patient';
}

interface PatientRequest extends Request {
  patient?: {
    phone: string;
    tenantId: string;
  };
}

@Injectable()
export class PatientAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  private getPatientSecret(): string {
    const secret = process.env.PATIENT_JWT_SECRET;
    if (!secret) {
      throw new Error('CRITICAL: PATIENT_JWT_SECRET is not configured.');
    }
    return secret;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PatientRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }

    try {
      const payload = await this.jwtService.verifyAsync<PatientPayload>(token, {
        secret: this.getPatientSecret(),
      });

      // Verify this is a patient token, not an admin token
      if (payload.type !== 'patient' || payload.role !== 'PATIENT') {
        throw new UnauthorizedException('Token patient invalide');
      }

      // Attach patient info to request
      request.patient = {
        phone: payload.phone,
        tenantId: payload.tenantId,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }

  private extractToken(request: PatientRequest): string | undefined {
    const cookieToken = request.cookies?.patient_access_token as
      | string
      | undefined;
    if (cookieToken) return cookieToken;

    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}

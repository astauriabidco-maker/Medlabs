import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class MagicLinkService {
    constructor(private readonly jwtService: JwtService) { }

    async generateLink(documentId: string): Promise<string> {
        const payload = { sub: documentId, type: 'guest_access' };
        const token = this.jwtService.sign(payload, {
            secret: process.env.PATIENT_JWT_SECRET || (() => { throw new Error('CRITICAL: PATIENT_JWT_SECRET not configured'); })(),
            expiresIn: '48h',
        });

        // TODO: In production, use the actual domain from env
        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
        return `${baseUrl}/guest/access?token=${token}`;
    }
}

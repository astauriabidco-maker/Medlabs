import {
    Controller,
    Post,
    Body,
    UnauthorizedException,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
    HttpCode,
    HttpStatus,
    HttpException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { SmsService } from '../notifications/sms.service';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

@Controller('auth/guest')
export class PatientAuthController {
    private readonly s3Client: S3Client;

    constructor(
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
        private readonly smsService: SmsService,
    ) {
        this.s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minio',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minio123',
            },
            endpoint: process.env.AWS_S3_ENDPOINT || 'http://localhost:9000',
            forcePathStyle: true, // Needed for MinIO/Localstack
        });
    }

    @Post('challenge')
    @HttpCode(HttpStatus.OK)
    async challenge(@Body('token') token: string) {
        if (!token) throw new BadRequestException('Token is required');

        let payload: any;
        try {
            payload = this.jwtService.verify(token, {
                secret: process.env.PATIENT_JWT_SECRET || 'dev_secret_key_123',
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }

        if (payload.type !== 'guest_access') {
            throw new UnauthorizedException('Invalid token type');
        }

        const documentId = payload.sub;
        const document = await this.prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        if (document.status === 'EXPIRED') {
            throw new HttpException('Document has expired due to data retention policy', HttpStatus.GONE);
        }

        // Generate 6-digit OTP
        const code = randomInt(100000, 999999).toString();
        const hashedCode = await bcrypt.hash(code, 10);
        const tokenSignature = token.split('.')[2]; // Use signature part as ID

        // Store in DB (Prisma OtpStore)
        // Upsert to handle re-requests
        await this.prisma.otpStore.deleteMany({
            where: { tokenSignature },
        }); // Clear previous attempts for this token if any (or we could just add meaningful logic)

        await this.prisma.otpStore.create({
            data: {
                tokenSignature,
                codeHash: hashedCode,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
                attempts: 0,
            },
        });

        await this.smsService.sendOtp(document.patientPhone, code);

        // Mask phone number
        const phone = document.patientPhone;
        const masked = phone ? `${phone.slice(0, 4)}***${phone.slice(-3)}` : '***';

        return { message: `OTP sent to ${masked}` };
    }

    @Post('verify')
    @HttpCode(HttpStatus.OK)
    async verify(@Body() body: { token: string; code: string }) {
        const { token, code } = body;
        if (!token || !code) throw new BadRequestException('Token and code are required');

        // 1. Verify JWT
        try {
            this.jwtService.verify(token, {
                secret: process.env.PATIENT_JWT_SECRET || 'dev_secret_key_123',
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }

        const tokenSignature = token.split('.')[2];

        // 2. Fetch OTP Record
        const otpRecord = await this.prisma.otpStore.findFirst({
            where: { tokenSignature }
        });

        if (!otpRecord) {
            throw new BadRequestException('No OTP request found for this token');
        }

        if (new Date() > otpRecord.expiresAt) {
            throw new BadRequestException('OTP has expired. Request a new one.');
        }

        if (otpRecord.attempts >= 3) {
            throw new ForbiddenException('Too many failed attempts. Request a new OTP.');
        }

        // 3. Verify Code
        const isMatch = await bcrypt.compare(code, otpRecord.codeHash);
        if (!isMatch) {
            // Increment attempts
            await this.prisma.otpStore.update({
                where: { id: otpRecord.id },
                data: { attempts: { increment: 1 } }
            });
            throw new ForbiddenException('Invalid OTP code');
        }

        // 4. Success - Audit & Generate Link
        const payload = this.jwtService.decode(token) as any;
        const documentId = payload.sub;

        const document = await this.prisma.document.findUnique({ where: { id: documentId } });
        if (!document) throw new NotFoundException('Document not found');

        if (document.status === 'EXPIRED') {
            throw new HttpException('Document has expired due to data retention policy', HttpStatus.GONE);
        }

        await this.prisma.auditLog.create({
            data: {
                action: 'VIEW_DOCUMENT',
                tenantId: document.tenantId,
                resourceId: document.id,
                actorId: 'PATIENT',
                description: 'Patient accessed document via proper 2FA',
            }
        });

        // Update Document Status if strictly needed (e.g., OPENED)
        if (document.status !== 'OPENED') {
            await this.prisma.document.update({
                where: { id: documentId },
                data: { status: 'OPENED' }
            });
        }

        // Cleanup OTP
        await this.prisma.otpStore.delete({ where: { id: otpRecord.id } });

        // Generate S3 Presigned URL
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME || 'medlab-documents',
            Key: document.fileKey,
        });

        // Link valid for 5 minutes
        try {
            const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });
            return { downloadUrl, status: 'success' };
        } catch (error) {
            console.error(error);
            throw new BadRequestException('Could not generate download link');
        }
    }

    @Post('verify-fallback')
    @HttpCode(HttpStatus.OK)
    async verifyFallback(@Body() body: { token: string; dob: string }) {
        const { token, dob } = body;
        if (!token || !dob) throw new BadRequestException('Token and Date of Birth are required');

        // 1. Verify JWT
        try {
            this.jwtService.verify(token, {
                secret: process.env.PATIENT_JWT_SECRET || 'dev_secret_key_123',
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }

        const tokenSignature = token.split('.')[2];

        // 2. Fetch OTP Record (Used for Rate Limiting)
        // We assume the user has already triggered a challenge (hence accessing this fallback)
        const otpRecord = await this.prisma.otpStore.findFirst({
            where: { tokenSignature }
        });

        if (!otpRecord) {
            // If no record, it usually means the session expired or wasn't started.
            // We could be lenient and create one, but strictly speaking, fallback follows challenge.
            throw new BadRequestException('Session invalid or expired. Please restart the process.');
        }

        if (new Date() > otpRecord.expiresAt) {
            throw new BadRequestException('Session has expired. Request a new link.');
        }

        if (otpRecord.attempts >= 5) {
            throw new ForbiddenException('Too many failed attempts. Access blocked.');
        }

        const payload = this.jwtService.decode(token) as any;
        const documentId = payload.sub;

        const document = await this.prisma.document.findUnique({ where: { id: documentId } });
        if (!document) throw new NotFoundException('Document not found');

        if (document.status === 'EXPIRED') {
            throw new HttpException('Document has expired due to data retention policy', HttpStatus.GONE);
        }

        if (!document.patientDob) {
            throw new BadRequestException('Fallback authentication unavailable for this document. Please contact the Lab.');
        }

        // 3. Verify Date of Birth
        // Format of input dob should be YYYY-MM-DD. Document DOB is a Date object.
        const inputDate = new Date(dob);
        const docDate = new Date(document.patientDob);

        // Compare YYYY-MM-DD
        const isMatch =
            inputDate.getFullYear() === docDate.getFullYear() &&
            inputDate.getMonth() === docDate.getMonth() &&
            inputDate.getDate() === docDate.getDate();

        if (!isMatch) {
            // Increment attempts
            await this.prisma.otpStore.update({
                where: { id: otpRecord.id },
                data: { attempts: { increment: 1 } }
            });
            throw new ForbiddenException('Incorrect Date of Birth');
        }

        // 4. Success
        await this.prisma.auditLog.create({
            data: {
                action: 'VIEW_DOCUMENT', // or specific action like VIEW_DOCUMENT_FALLBACK
                tenantId: document.tenantId,
                resourceId: document.id,
                actorId: 'PATIENT',
                description: 'Patient accessed document via DOB Fallback',
            }
        });

        if (document.status !== 'OPENED') {
            await this.prisma.document.update({
                where: { id: documentId },
                data: { status: 'OPENED' }
            });
        }

        // Cleanup
        await this.prisma.otpStore.delete({ where: { id: otpRecord.id } });

        // Generate URL
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME || 'medlab-documents',
            Key: document.fileKey,
        });

        try {
            const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });
            return { downloadUrl, status: 'success' };
        } catch (error) {
            console.error(error);
            throw new BadRequestException('Could not generate download link');
        }
    }

    /**
     * NEW: Verify using physical access code from receipt
     * This replaces OTP/DOB verification with a simple code printed on the patient's receipt
     */
    @Post('verify-code')
    @HttpCode(HttpStatus.OK)
    async verifyCode(@Body() body: { token: string; accessCode: string }) {
        const { token, accessCode } = body;
        if (!token || !accessCode) throw new BadRequestException('Token and access code are required');

        // 1. Verify JWT
        let payload: any;
        try {
            payload = this.jwtService.verify(token, {
                secret: process.env.PATIENT_JWT_SECRET || 'dev_secret_key_123',
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired link');
        }

        if (payload.type !== 'guest_access') {
            throw new UnauthorizedException('Invalid token type');
        }

        const documentId = payload.sub;
        const document = await this.prisma.document.findUnique({ where: { id: documentId } });

        if (!document) throw new NotFoundException('Document not found');

        if (document.status === 'EXPIRED') {
            throw new HttpException('Document has expired due to data retention policy', HttpStatus.GONE);
        }

        // Check if document is anonymized
        if (document.isAnonymized) {
            throw new HttpException(
                { message: 'Document has been archived', isAnonymized: true },
                HttpStatus.GONE
            );
        }

        // 2. Verify Access Code
        if (!document.accessCode) {
            throw new BadRequestException('No access code available for this document. Please contact the laboratory.');
        }

        // Normalize comparison (case-insensitive, trim whitespace)
        const normalizedInput = accessCode.trim().toUpperCase();
        const normalizedStored = document.accessCode.trim().toUpperCase();

        if (normalizedInput !== normalizedStored) {
            throw new ForbiddenException('Invalid access code. Please check the code on your receipt.');
        }

        // Check payment status - block access if unpaid
        const paymentStatus = (document as any).paymentStatus;
        const price = (document as any).price;

        if (paymentStatus === 'UNPAID' && price > 0) {
            // Return payment required response
            return {
                status: 'payment_required',
                paymentStatus: 'UNPAID',
                price,
                documentId: document.id,
            };
        }

        // 3. Success - Audit & Generate Link
        await this.prisma.auditLog.create({
            data: {
                action: 'VIEW_DOCUMENT',
                tenantId: document.tenantId,
                resourceId: document.id,
                actorId: 'PATIENT',
                description: 'Patient accessed document via physical access code',
            }
        });

        // Update Document Status
        if (document.status !== 'OPENED') {
            await this.prisma.document.update({
                where: { id: documentId },
                data: { status: 'OPENED' }
            });
        }

        // Generate S3 Presigned URL
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME || 'medlab-documents',
            Key: document.fileKey,
        });

        try {
            const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });
            return { downloadUrl, status: 'success' };
        } catch (error) {
            console.error(error);
            throw new BadRequestException('Could not generate download link');
        }
    }
}

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class SignaturesService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Sign a document electronically
     */
    async signDocument(tenantId: string, documentId: string, userId: string, pin?: string) {
        // Get document
        const document = await this.prisma.document.findFirst({
            where: { id: documentId, tenantId },
            select: { id: true, folderRef: true, status: true, fileKey: true, signedAt: true },
        });

        if (!document) throw new NotFoundException('Document not found');
        if (document.signedAt) throw new ConflictException('Document is already signed');

        // Get user info
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, firstName: true, lastName: true },
        });

        if (!user) throw new NotFoundException('User not found');

        // Generate cryptographic signature
        const signatureData = {
            documentId: document.id,
            folderRef: document.folderRef,
            fileKey: document.fileKey,
            signedBy: userId,
            signedAt: new Date().toISOString(),
            timestamp: Date.now(),
        };

        const signature = this.generateSignature(signatureData);

        // Update document with signature
        const updated = await this.prisma.document.update({
            where: { id: documentId },
            data: {
                signedAt: new Date(),
                signedById: userId,
                signatureHash: signature,
            },
        });

        const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

        return {
            success: true,
            documentId,
            signedAt: updated.signedAt,
            signedBy: userName,
            signatureHash: signature.substring(0, 16) + '...',
            message: 'Document signed successfully',
        };
    }

    /**
     * Verify a document signature
     */
    async verifySignature(tenantId: string, documentId: string) {
        const document = await this.prisma.document.findFirst({
            where: { id: documentId, tenantId },
            select: {
                id: true,
                folderRef: true,
                fileKey: true,
                signedAt: true,
                signedById: true,
                signatureHash: true,
            },
        });

        if (!document) throw new NotFoundException('Document not found');

        if (!document.signedAt || !document.signatureHash) {
            return {
                verified: false,
                reason: 'Document is not signed',
                recommendation: 'Use POST /signatures/sign/:documentId to sign this document',
            };
        }

        // Get signer info
        const signer = document.signedById ? await this.prisma.user.findUnique({
            where: { id: document.signedById },
            select: { id: true, email: true, firstName: true, lastName: true },
        }) : null;

        // Verify signature integrity
        const signatureData = {
            documentId: document.id,
            folderRef: document.folderRef,
            fileKey: document.fileKey,
            signedBy: document.signedById,
            signedAt: document.signedAt?.toISOString(),
            timestamp: document.signedAt?.getTime(),
        };

        const expectedSignature = this.generateSignature(signatureData);
        const isValid = expectedSignature === document.signatureHash;

        const signerName = signer ? [signer.firstName, signer.lastName].filter(Boolean).join(' ') || signer.email : 'Unknown';

        return {
            verified: isValid,
            documentId,
            signedAt: document.signedAt,
            signedBy: signerName,
            signaturePreview: document.signatureHash.substring(0, 16) + '...',
            integrityStatus: isValid ? 'VALID' : 'TAMPERED',
        };
    }

    /**
     * Get signature history for a document
     */
    async getSignatureHistory(tenantId: string, documentId: string) {
        const document = await this.prisma.document.findFirst({
            where: { id: documentId, tenantId },
            select: {
                id: true,
                folderRef: true,
                signedAt: true,
                signedById: true,
                signatureHash: true,
                createdAt: true,
                uploadedById: true,
            },
        });

        if (!document) throw new NotFoundException('Document not found');

        // Get uploader info
        const uploader = document.uploadedById ? await this.prisma.user.findUnique({
            where: { id: document.uploadedById },
            select: { firstName: true, lastName: true, email: true },
        }) : null;

        // Get signer info
        const signer = document.signedById ? await this.prisma.user.findUnique({
            where: { id: document.signedById },
            select: { firstName: true, lastName: true, email: true },
        }) : null;

        const uploaderName = uploader ? [uploader.firstName, uploader.lastName].filter(Boolean).join(' ') || uploader.email : 'Unknown';
        const signerName = signer ? [signer.firstName, signer.lastName].filter(Boolean).join(' ') || signer.email : 'Unknown';

        return {
            documentId,
            folderRef: document.folderRef,
            timeline: [
                {
                    action: 'CREATED',
                    timestamp: document.createdAt,
                    actor: uploaderName,
                },
                ...(document.signedAt ? [{
                    action: 'SIGNED',
                    timestamp: document.signedAt,
                    actor: signerName,
                    signatureHash: document.signatureHash?.substring(0, 16) + '...',
                }] : []),
            ],
            isSigned: !!document.signedAt,
        };
    }

    /**
     * Generate a cryptographic signature
     */
    private generateSignature(data: any): string {
        // SECURITY: Use dedicated signature secret, fall back to JWT_SECRET, never use a hardcoded string
        const secret = process.env.SIGNATURE_SECRET || process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('CRITICAL: No signature secret configured (SIGNATURE_SECRET or JWT_SECRET)');
        }
        const payload = JSON.stringify(data);
        return crypto.createHmac('sha256', secret).update(payload).digest('hex');
    }
}

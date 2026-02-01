import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * AES-256-CBC Encryption Service for sensitive data
 * Used to encrypt API tokens before storing in database
 */
@Injectable()
export class EncryptionService {
    private readonly logger = new Logger(EncryptionService.name);
    private readonly algorithm = 'aes-256-cbc';
    private readonly key: Buffer;

    constructor() {
        // Use ENCRYPTION_KEY or fallback to JWT_SECRET
        const masterKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;

        if (!masterKey) {
            this.logger.error('ENCRYPTION_KEY or JWT_SECRET must be set!');
            throw new Error('Encryption master key not configured');
        }

        // Derive a 32-byte key from the master key using SHA-256
        this.key = crypto.createHash('sha256').update(masterKey).digest();
    }

    /**
     * Encrypt a plain text string
     * Returns format: iv:encryptedData (both hex encoded)
     */
    encrypt(text: string): string {
        if (!text) return '';

        try {
            // Generate random IV for each encryption
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            // Return IV + encrypted data (IV needed for decryption)
            return `${iv.toString('hex')}:${encrypted}`;
        } catch (error) {
            this.logger.error('Encryption failed', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt an encrypted string
     * Expects format: iv:encryptedData (hex encoded)
     */
    decrypt(hash: string): string {
        if (!hash) return '';

        try {
            const [ivHex, encryptedData] = hash.split(':');

            if (!ivHex || !encryptedData) {
                throw new Error('Invalid encrypted format');
            }

            const iv = Buffer.from(ivHex, 'hex');
            const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            this.logger.error('Decryption failed', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Check if a string is encrypted (has the iv:data format)
     */
    isEncrypted(value: string): boolean {
        if (!value) return false;
        const parts = value.split(':');
        // IV is 16 bytes = 32 hex chars, encrypted data should exist
        return parts.length === 2 && parts[0].length === 32 && parts[1].length > 0;
    }
}

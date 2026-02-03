import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma.service';

const OCR_KEYWORDS_CACHE_KEY = 'ocr:keywords:active';
const OCR_KEYWORDS_CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

@Injectable()
export class OcrConfigService {
    constructor(
        private prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
    ) { }

    /**
     * Invalidate the OCR keywords cache
     */
    private async invalidateCache() {
        try {
            await this.cacheManager.del(OCR_KEYWORDS_CACHE_KEY);
            console.log('[OcrConfig] Cache invalidated');
        } catch (error) {
            console.warn('[OcrConfig] Cache invalidation failed:', error.message);
        }
    }

    /**
     * Get all keywords (for admin panel)
     */
    async findAll() {
        return this.prisma.ocrExclusionKeyword.findMany({
            orderBy: [
                { category: 'asc' },
                { keyword: 'asc' }
            ]
        });
    }

    /**
     * Get only active keywords (for PDF extractor)
     * CACHED: Results are cached in Redis for 1 hour
     */
    async findActive() {
        // Try cache first
        try {
            const cached = await this.cacheManager.get(OCR_KEYWORDS_CACHE_KEY);
            if (cached) {
                console.log('[OcrConfig] Cache HIT for keywords');
                return cached;
            }
        } catch (error) {
            console.warn('[OcrConfig] Cache read failed:', error.message);
        }

        // Fetch from database
        console.log('[OcrConfig] Cache MISS - fetching from database');
        const keywords = await this.prisma.ocrExclusionKeyword.findMany({
            where: { isActive: true },
            select: { keyword: true, category: true }
        });

        // Store in cache
        try {
            await this.cacheManager.set(OCR_KEYWORDS_CACHE_KEY, keywords, OCR_KEYWORDS_CACHE_TTL);
            console.log('[OcrConfig] Cached', keywords.length, 'keywords');
        } catch (error) {
            console.warn('[OcrConfig] Cache write failed:', error.message);
        }

        return keywords;
    }

    /**
     * Create a new exclusion keyword
     */
    async create(keyword: string, category: string = 'role') {
        const result = await this.prisma.ocrExclusionKeyword.create({
            data: {
                keyword: keyword.toLowerCase().trim(),
                category
            }
        });
        await this.invalidateCache();
        return result;
    }

    /**
     * Update a keyword (toggle active, change category)
     */
    async update(id: string, data: { keyword?: string; category?: string; isActive?: boolean }) {
        const result = await this.prisma.ocrExclusionKeyword.update({
            where: { id },
            data: {
                ...(data.keyword && { keyword: data.keyword.toLowerCase().trim() }),
                ...(data.category && { category: data.category }),
                ...(data.isActive !== undefined && { isActive: data.isActive })
            }
        });
        await this.invalidateCache();
        return result;
    }

    /**
     * Delete a keyword
     */
    async delete(id: string) {
        const result = await this.prisma.ocrExclusionKeyword.delete({
            where: { id }
        });
        await this.invalidateCache();
        return result;
    }

    /**
     * Seed default keywords (called on first setup)
     */
    async seedDefaults() {
        const defaults = [
            // Administrative roles
            { keyword: 'major', category: 'role' },
            { keyword: 'vice major', category: 'role' },
            { keyword: 'chef de service', category: 'role' },
            { keyword: 'directeur', category: 'role' },
            { keyword: 'responsable', category: 'role' },
            { keyword: 'secrétaire', category: 'role' },
            // Medical/Technical roles
            { keyword: 'biologiste', category: 'role' },
            { keyword: 'pharmacien', category: 'role' },
            { keyword: 'technicien', category: 'role' },
            { keyword: 'laborantin', category: 'role' },
            { keyword: 'infirmier', category: 'role' },
            { keyword: 'médecin', category: 'role' },
            // Professional titles
            { keyword: 'dr', category: 'title' },
            { keyword: 'pr', category: 'title' },
            // Context patterns
            { keyword: 'agrément', category: 'context' },
            { keyword: 'accréditation', category: 'context' },
        ];

        for (const item of defaults) {
            try {
                await this.prisma.ocrExclusionKeyword.upsert({
                    where: { keyword: item.keyword },
                    update: {},
                    create: item
                });
            } catch (e) {
                // Ignore duplicates
            }
        }

        await this.invalidateCache();
        return { seeded: defaults.length };
    }
}

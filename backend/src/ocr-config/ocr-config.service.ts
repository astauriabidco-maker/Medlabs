import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OcrConfigService {
    constructor(private prisma: PrismaService) { }

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
     */
    async findActive() {
        return this.prisma.ocrExclusionKeyword.findMany({
            where: { isActive: true },
            select: { keyword: true, category: true }
        });
    }

    /**
     * Create a new exclusion keyword
     */
    async create(keyword: string, category: string = 'role') {
        return this.prisma.ocrExclusionKeyword.create({
            data: {
                keyword: keyword.toLowerCase().trim(),
                category
            }
        });
    }

    /**
     * Update a keyword (toggle active, change category)
     */
    async update(id: string, data: { keyword?: string; category?: string; isActive?: boolean }) {
        return this.prisma.ocrExclusionKeyword.update({
            where: { id },
            data: {
                ...(data.keyword && { keyword: data.keyword.toLowerCase().trim() }),
                ...(data.category && { category: data.category }),
                ...(data.isActive !== undefined && { isActive: data.isActive })
            }
        });
    }

    /**
     * Delete a keyword
     */
    async delete(id: string) {
        return this.prisma.ocrExclusionKeyword.delete({
            where: { id }
        });
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

        return { seeded: defaults.length };
    }
}

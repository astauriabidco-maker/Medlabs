/**
 * OCR Config Service Unit Tests
 * Tests CRUD operations and Redis caching behavior
 */
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { OcrConfigService } from './ocr-config.service';
import { PrismaService } from '../prisma.service';
import { createMockPrismaService, createMockCacheManager } from '../test/mocks';

describe('OcrConfigService', () => {
    let service: OcrConfigService;
    let prisma: ReturnType<typeof createMockPrismaService>;
    let cacheManager: ReturnType<typeof createMockCacheManager>;

    const mockKeywords = [
        { id: '1', keyword: 'major', category: 'role', isActive: true, createdAt: new Date() },
        { id: '2', keyword: 'biologiste', category: 'role', isActive: true, createdAt: new Date() },
        { id: '3', keyword: 'dr', category: 'title', isActive: true, createdAt: new Date() },
    ];

    beforeEach(async () => {
        prisma = createMockPrismaService();
        cacheManager = createMockCacheManager();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OcrConfigService,
                { provide: PrismaService, useValue: prisma },
                { provide: CACHE_MANAGER, useValue: cacheManager },
            ],
        }).compile();

        service = module.get<OcrConfigService>(OcrConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return all keywords ordered by category and keyword', async () => {
            prisma.ocrExclusionKeyword.findMany.mockResolvedValue(mockKeywords);

            const result = await service.findAll();

            expect(result).toEqual(mockKeywords);
            expect(prisma.ocrExclusionKeyword.findMany).toHaveBeenCalledWith({
                orderBy: [
                    { category: 'asc' },
                    { keyword: 'asc' }
                ]
            });
        });
    });

    describe('findActive (with caching)', () => {
        it('should return cached data on cache HIT', async () => {
            const cachedKeywords = [{ keyword: 'cached', category: 'role' }];
            cacheManager.get.mockResolvedValue(cachedKeywords);

            const result = await service.findActive();

            expect(result).toEqual(cachedKeywords);
            expect(cacheManager.get).toHaveBeenCalledWith('ocr:keywords:active');
            expect(prisma.ocrExclusionKeyword.findMany).not.toHaveBeenCalled();
        });

        it('should fetch from database on cache MISS and cache the result', async () => {
            cacheManager.get.mockResolvedValue(null); // Cache MISS
            const dbKeywords = [
                { keyword: 'major', category: 'role' },
                { keyword: 'biologiste', category: 'role' }
            ];
            prisma.ocrExclusionKeyword.findMany.mockResolvedValue(dbKeywords);

            const result = await service.findActive();

            expect(result).toEqual(dbKeywords);
            expect(prisma.ocrExclusionKeyword.findMany).toHaveBeenCalledWith({
                where: { isActive: true },
                select: { keyword: true, category: true }
            });
            expect(cacheManager.set).toHaveBeenCalledWith(
                'ocr:keywords:active',
                dbKeywords,
                60 * 60 * 1000 // 1 hour TTL
            );
        });

        it('should handle cache read errors gracefully and fallback to database', async () => {
            cacheManager.get.mockRejectedValue(new Error('Redis connection failed'));
            const dbKeywords = [{ keyword: 'fallback', category: 'role' }];
            prisma.ocrExclusionKeyword.findMany.mockResolvedValue(dbKeywords);

            const result = await service.findActive();

            expect(result).toEqual(dbKeywords);
        });
    });

    describe('create', () => {
        it('should create keyword and invalidate cache', async () => {
            const newKeyword = { id: '4', keyword: 'secrétaire', category: 'role', isActive: true };
            prisma.ocrExclusionKeyword.create.mockResolvedValue(newKeyword);

            const result = await service.create('Secrétaire', 'role');

            expect(result).toEqual(newKeyword);
            expect(prisma.ocrExclusionKeyword.create).toHaveBeenCalledWith({
                data: {
                    keyword: 'secrétaire', // Should be lowercased and trimmed
                    category: 'role'
                }
            });
            expect(cacheManager.del).toHaveBeenCalledWith('ocr:keywords:active');
        });

        it('should lowercase and trim keyword input', async () => {
            prisma.ocrExclusionKeyword.create.mockResolvedValue({ id: '5', keyword: 'test', category: 'role' });

            await service.create('  TEST KEYWORD  ', 'role');

            expect(prisma.ocrExclusionKeyword.create).toHaveBeenCalledWith({
                data: {
                    keyword: 'test keyword',
                    category: 'role'
                }
            });
        });
    });

    describe('update', () => {
        it('should update keyword and invalidate cache', async () => {
            const updatedKeyword = { id: '1', keyword: 'major updated', category: 'role', isActive: false };
            prisma.ocrExclusionKeyword.update.mockResolvedValue(updatedKeyword);

            const result = await service.update('1', { isActive: false });

            expect(result).toEqual(updatedKeyword);
            expect(cacheManager.del).toHaveBeenCalledWith('ocr:keywords:active');
        });

        it('should only update provided fields', async () => {
            prisma.ocrExclusionKeyword.update.mockResolvedValue({ id: '1', keyword: 'major' });

            await service.update('1', { isActive: true });

            expect(prisma.ocrExclusionKeyword.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: { isActive: true }
            });
        });
    });

    describe('delete', () => {
        it('should delete keyword and invalidate cache', async () => {
            const deletedKeyword = { id: '1', keyword: 'major', category: 'role' };
            prisma.ocrExclusionKeyword.delete.mockResolvedValue(deletedKeyword);

            const result = await service.delete('1');

            expect(result).toEqual(deletedKeyword);
            expect(prisma.ocrExclusionKeyword.delete).toHaveBeenCalledWith({
                where: { id: '1' }
            });
            expect(cacheManager.del).toHaveBeenCalledWith('ocr:keywords:active');
        });
    });

    describe('seedDefaults', () => {
        it('should upsert default keywords and invalidate cache', async () => {
            prisma.ocrExclusionKeyword.upsert = jest.fn().mockResolvedValue({});

            const result = await service.seedDefaults();

            expect(result.seeded).toBeGreaterThan(0);
            expect(prisma.ocrExclusionKeyword.upsert).toHaveBeenCalled();
            expect(cacheManager.del).toHaveBeenCalledWith('ocr:keywords:active');
        });
    });

    describe('Cache Invalidation', () => {
        it('should handle cache invalidation errors gracefully', async () => {
            cacheManager.del.mockRejectedValue(new Error('Redis down'));
            prisma.ocrExclusionKeyword.create.mockResolvedValue({ id: 'new', keyword: 'test' });

            // Should not throw even if cache invalidation fails
            await expect(service.create('test', 'role')).resolves.toBeDefined();
        });
    });
});

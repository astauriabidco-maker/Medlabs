import { PatientHistoryController } from './history.controller';
import { PrismaService } from '../prisma.service';
import { createMockPrismaService } from '../test/mocks';

type PatientRequestArg = Parameters<
  PatientHistoryController['getDocuments']
>[0];

describe('PatientHistoryController', () => {
  let controller: PatientHistoryController;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    controller = new PatientHistoryController(
      prisma as unknown as PrismaService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('filters documents by resolved tenant and hides deleted, purged, and anonymized documents', async () => {
    const createdAt = new Date('2026-05-16T10:00:00.000Z');
    prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-resolved' });
    prisma.document.findMany.mockResolvedValue([
      {
        id: 'doc-visible',
        patientFirstName: 'Amina',
        patientLastName: 'Ngono',
        createdAt,
        status: 'DELIVERED',
        accessKey: 'access-123',
        mimeType: 'application/pdf',
      },
    ]);

    const request = {
      patient: {
        phone: '+237612345678',
        tenantId: 'lab-slug',
      },
    } as unknown as PatientRequestArg;
    const result = await controller.getDocuments(request);

    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: 'lab-slug' },
      select: { id: true },
    });
    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: {
        patientPhone: '+237612345678',
        tenantId: 'tenant-resolved',
        status: { in: ['UPLOADED', 'NOTIFIED', 'DELIVERED', 'OPENED'] },
        deletedAt: null,
        purgedAt: null,
        isAnonymized: false,
      },
      select: {
        id: true,
        patientFirstName: true,
        patientLastName: true,
        createdAt: true,
        status: true,
        accessKey: true,
        mimeType: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual({
      documents: [
        {
          id: 'doc-visible',
          patientName: 'Amina Ngono',
          date: '2026-05-16T10:00:00.000Z',
          status: 'DELIVERED',
          mimeType: 'application/pdf',
          downloadUrl: '/api/guest/download/access-123',
        },
      ],
      total: 1,
    });
  });

  it('uses a UUID tenant directly without slug lookup', async () => {
    const tenantId = '11111111-2222-4333-8444-555555555555';
    prisma.document.findMany.mockResolvedValue([]);

    const request = {
      patient: {
        phone: '+237612345678',
        tenantId,
      },
    } as unknown as PatientRequestArg;
    await controller.getDocuments(request);

    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: {
        patientPhone: '+237612345678',
        tenantId,
        status: { in: ['UPLOADED', 'NOTIFIED', 'DELIVERED', 'OPENED'] },
        deletedAt: null,
        purgedAt: null,
        isAnonymized: false,
      },
      select: {
        id: true,
        patientFirstName: true,
        patientLastName: true,
        createdAt: true,
        status: true,
        accessKey: true,
        mimeType: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns no documents when the tenant slug cannot be resolved', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);

    const request = {
      patient: {
        phone: '+237612345678',
        tenantId: 'unknown-lab',
      },
    } as unknown as PatientRequestArg;

    await expect(controller.getDocuments(request)).resolves.toEqual({
      documents: [],
      message: 'Tenant not found',
    });

    expect(prisma.document.findMany).not.toHaveBeenCalled();
  });
});

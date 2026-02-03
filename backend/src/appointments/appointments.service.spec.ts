/**
 * Appointments Service Unit Tests
 * Tests booking, slots availability, status updates, and calendar generation
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppointmentsService, BookAppointmentDto } from './appointments.service';
import { PrismaService } from '../prisma.service';
import { DynamicNotificationService } from '../notifications/dynamic-notification.service';
import { EmailService } from '../notifications/email.service';
import { AppointmentType, AppointmentStatus } from '@prisma/client';

// Mock Prisma with dynamic model access
const createMockPrismaForAppointments = () => ({
    tenant: {
        findUnique: jest.fn(),
    },
    appointment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    appointmentHistory: {
        findMany: jest.fn(),
        create: jest.fn(),
    },
    blockedSlot: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
    },
});

const createMockNotificationService = () => ({
    sendWhatsApp: jest.fn().mockResolvedValue({ success: true }),
    sendSms: jest.fn().mockResolvedValue({ success: true }),
});

const createMockEmailService = () => ({
    sendAppointmentConfirmation: jest.fn().mockResolvedValue(undefined),
});

// Test data factories
const createTestTenant = (overrides: Record<string, any> = {}) => ({
    id: 'tenant-456',
    name: 'LabTest Cameroun',
    slug: 'labtest-cm',
    phoneNumber: '+237699000000',
    isHomeSamplingEnabled: true,
    appointmentDuration: 15,
    openingTime: '08:00',
    closingTime: '18:00',
    maxAppointmentsPerSlot: 2,
    features: ['APPOINTMENT_BOOKING'],
    ...overrides,
});

const createTestAppointment = (overrides: Record<string, any> = {}) => ({
    id: 'apt-123',
    tenantId: 'tenant-456',
    patientName: 'Jean Dupont',
    patientPhone: '612345678',
    patientEmail: 'patient@test.cm',
    type: AppointmentType.LAB_VISIT,
    date: new Date('2026-02-10T10:00:00Z'),
    address: null,
    notes: null,
    status: AppointmentStatus.PENDING,
    createdAt: new Date(),
    ...overrides,
});

describe('AppointmentsService', () => {
    let service: AppointmentsService;
    let prisma: ReturnType<typeof createMockPrismaForAppointments>;
    let notificationService: ReturnType<typeof createMockNotificationService>;
    let emailService: ReturnType<typeof createMockEmailService>;

    beforeEach(async () => {
        prisma = createMockPrismaForAppointments();
        notificationService = createMockNotificationService();
        emailService = createMockEmailService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppointmentsService,
                { provide: PrismaService, useValue: prisma },
                { provide: DynamicNotificationService, useValue: notificationService },
                { provide: EmailService, useValue: emailService },
            ],
        }).compile();

        service = module.get<AppointmentsService>(AppointmentsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('bookAppointment', () => {
        const validDto: BookAppointmentDto = {
            tenantId: 'tenant-456',
            name: 'Jean Dupont',
            phone: '+237612345678',
            email: 'patient@test.cm',
            type: AppointmentType.LAB_VISIT,
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        };

        it('should create appointment and return success', async () => {
            prisma.tenant.findUnique.mockResolvedValue(createTestTenant());
            prisma.appointment.findFirst.mockResolvedValue(null); // Slot free
            prisma.appointment.create.mockResolvedValue(createTestAppointment());
            prisma.appointmentHistory.create.mockResolvedValue({});

            const result = await service.bookAppointment(validDto);

            expect(result.success).toBe(true);
            expect(result.appointmentId).toBe('apt-123');
            expect(prisma.appointment.create).toHaveBeenCalled();
            expect(prisma.appointmentHistory.create).toHaveBeenCalled();
        });

        it('should throw NotFoundException for unknown tenant', async () => {
            prisma.tenant.findUnique.mockResolvedValue(null);

            await expect(
                service.bookAppointment(validDto)
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException when home sampling disabled', async () => {
            prisma.tenant.findUnique.mockResolvedValue(
                createTestTenant({ isHomeSamplingEnabled: false })
            );

            await expect(
                service.bookAppointment({ ...validDto, type: AppointmentType.HOME_SAMPLING })
            ).rejects.toThrow(BadRequestException);
        });

        it('should require address for home sampling', async () => {
            prisma.tenant.findUnique.mockResolvedValue(createTestTenant());

            await expect(
                service.bookAppointment({ ...validDto, type: AppointmentType.HOME_SAMPLING })
            ).rejects.toThrow(BadRequestException);
        });

        it('should accept home sampling with address', async () => {
            prisma.tenant.findUnique.mockResolvedValue(createTestTenant());
            prisma.appointment.findFirst.mockResolvedValue(null);
            prisma.appointment.create.mockResolvedValue(createTestAppointment({ type: 'HOME_SAMPLING' }));
            prisma.appointmentHistory.create.mockResolvedValue({});

            const result = await service.bookAppointment({
                ...validDto,
                type: AppointmentType.HOME_SAMPLING,
                address: 'Rue des Tests, Yaoundé',
            });

            expect(result.success).toBe(true);
        });

        it('should throw BadRequestException for past dates', async () => {
            prisma.tenant.findUnique.mockResolvedValue(createTestTenant());

            await expect(
                service.bookAppointment({
                    ...validDto,
                    date: new Date('2020-01-01').toISOString(),
                })
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException when slot already booked', async () => {
            prisma.tenant.findUnique.mockResolvedValue(createTestTenant());
            prisma.appointment.findFirst.mockResolvedValue(createTestAppointment()); // Slot taken

            await expect(
                service.bookAppointment(validDto)
            ).rejects.toThrow(BadRequestException);
        });

        it('should send email confirmation when email provided', async () => {
            prisma.tenant.findUnique.mockResolvedValue(createTestTenant());
            prisma.appointment.findFirst.mockResolvedValue(null);
            prisma.appointment.create.mockResolvedValue(createTestAppointment());
            prisma.appointmentHistory.create.mockResolvedValue({});

            await service.bookAppointment(validDto);

            // Wait for async email
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(emailService.sendAppointmentConfirmation).toHaveBeenCalled();
        });
    });

    describe('getAvailableSlots', () => {
        it('should return slots based on opening hours', async () => {
            prisma.tenant.findUnique.mockResolvedValue(
                createTestTenant({ openingTime: '09:00', closingTime: '12:00', appointmentDuration: 30 })
            );
            prisma.blockedSlot.findMany.mockResolvedValue([]);
            prisma.appointment.findMany.mockResolvedValue([]);

            const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const result = await service.getAvailableSlots('tenant-456', futureDate.toISOString());

            expect(result.length).toBeGreaterThan(0);
            expect(result[0].time).toBe('09:00');
            expect(result[result.length - 1].time).toBe('11:30'); // Last slot before closing
        });

        it('should return empty array for all-day blocked date', async () => {
            prisma.tenant.findUnique.mockResolvedValue(createTestTenant());
            prisma.blockedSlot.findMany.mockResolvedValue([{ allDay: true }]);

            const result = await service.getAvailableSlots('tenant-456', '2026-02-15');

            expect(result).toEqual([]);
        });

        it('should mark booked slots as unavailable', async () => {
            prisma.tenant.findUnique.mockResolvedValue(
                createTestTenant({ maxAppointmentsPerSlot: 1 })
            );
            prisma.blockedSlot.findMany.mockResolvedValue([]);

            // Create a date in the future for testing
            const futureDate = new Date('2026-02-15');
            const bookedTime = new Date(futureDate);
            bookedTime.setHours(9, 0, 0, 0);

            prisma.appointment.findMany.mockResolvedValue([
                { date: bookedTime },
            ]);

            const result = await service.getAvailableSlots('tenant-456', '2026-02-15');

            const bookedSlot = result.find((s: any) => s.time === '09:00');
            expect(bookedSlot?.available).toBe(false);
            expect(bookedSlot?.remainingSlots).toBe(0);
        });

        it('should handle multiple appointments per slot', async () => {
            prisma.tenant.findUnique.mockResolvedValue(
                createTestTenant({ maxAppointmentsPerSlot: 3 })
            );
            prisma.blockedSlot.findMany.mockResolvedValue([]);

            // Create dates with local timezone for proper time matching
            const futureDate = new Date('2026-02-15');
            const bookedTime = new Date(futureDate);
            bookedTime.setHours(10, 0, 0, 0);

            prisma.appointment.findMany.mockResolvedValue([
                { date: new Date(bookedTime) },
                { date: new Date(bookedTime) },
            ]);

            const result = await service.getAvailableSlots('tenant-456', '2026-02-15');

            const slot = result.find((s: any) => s.time === '10:00');
            expect(slot?.available).toBe(true);
            expect(slot?.remainingSlots).toBe(1);
        });

        it('should throw NotFoundException for unknown tenant', async () => {
            prisma.tenant.findUnique.mockResolvedValue(null);

            await expect(
                service.getAvailableSlots('unknown', '2026-02-15')
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateStatus', () => {
        it('should update status and log to history', async () => {
            prisma.appointment.findFirst.mockResolvedValue(
                createTestAppointment({ tenant: createTestTenant() })
            );
            prisma.appointment.update.mockResolvedValue(
                createTestAppointment({ status: 'CONFIRMED' })
            );
            prisma.appointmentHistory.create.mockResolvedValue({});

            const result = await service.updateStatus(
                'tenant-456',
                'apt-123',
                AppointmentStatus.CONFIRMED,
                'user-789',
                'Admin User'
            );

            expect(result.status).toBe('CONFIRMED');
            expect(prisma.appointmentHistory.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    action: 'STATUS_CHANGED',
                    oldStatus: 'PENDING',
                    newStatus: 'CONFIRMED',
                }),
            });
        });

        it('should send WhatsApp notification on CONFIRMED', async () => {
            prisma.appointment.findFirst.mockResolvedValue(
                createTestAppointment({ tenant: createTestTenant() })
            );
            prisma.appointment.update.mockResolvedValue(createTestAppointment({ status: 'CONFIRMED' }));
            prisma.appointmentHistory.create.mockResolvedValue({});

            await service.updateStatus('tenant-456', 'apt-123', AppointmentStatus.CONFIRMED);

            // Wait for async notification
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(notificationService.sendWhatsApp).toHaveBeenCalled();
        });

        it('should throw NotFoundException for unknown appointment', async () => {
            prisma.appointment.findFirst.mockResolvedValue(null);

            await expect(
                service.updateStatus('tenant-456', 'unknown', AppointmentStatus.CONFIRMED)
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('Blocked Slots Management', () => {
        it('should create blocked slot', async () => {
            prisma.blockedSlot.create.mockResolvedValue({
                id: 'block-123',
                date: new Date('2026-02-20'),
                allDay: true,
            });

            const result = await service.createBlockedSlot('tenant-456', {
                date: '2026-02-20',
                allDay: true,
                reason: 'Jour férié',
            });

            expect(result.id).toBe('block-123');
        });

        it('should delete blocked slot', async () => {
            prisma.blockedSlot.findFirst.mockResolvedValue({ id: 'block-123', tenantId: 'tenant-456' });
            prisma.blockedSlot.delete.mockResolvedValue({ id: 'block-123' });

            await service.deleteBlockedSlot('tenant-456', 'block-123');

            expect(prisma.blockedSlot.delete).toHaveBeenCalledWith({ where: { id: 'block-123' } });
        });

        it('should throw NotFoundException when deleting non-existent slot', async () => {
            prisma.blockedSlot.findFirst.mockResolvedValue(null);

            await expect(
                service.deleteBlockedSlot('tenant-456', 'unknown')
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('Calendar Generation', () => {
        const appointment = createTestAppointment();
        const tenant = createTestTenant();

        it('should generate valid iCal content', () => {
            const ical = service.generateICalEvent(appointment, tenant);

            expect(ical).toContain('BEGIN:VCALENDAR');
            expect(ical).toContain('BEGIN:VEVENT');
            expect(ical).toContain('SUMMARY:RDV LabTest Cameroun');
            expect(ical).toContain('END:VCALENDAR');
        });

        it('should generate Google Calendar link', () => {
            const link = service.getGoogleCalendarLink(appointment, tenant);

            expect(link).toContain('calendar.google.com');
            expect(link).toContain('action=TEMPLATE');
        });

        it('should generate Outlook Calendar link', () => {
            const link = service.getOutlookCalendarLink(appointment, tenant);

            expect(link).toContain('outlook.live.com');
            expect(link).toContain('deeplink/compose');
        });
    });
});

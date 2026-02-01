import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DynamicNotificationService } from '../notifications/dynamic-notification.service';
import { EmailService } from '../notifications/email.service';
import { AppointmentType, AppointmentStatus } from '@prisma/client';

export interface BookAppointmentDto {
    tenantId: string;
    name: string;
    phone: string;
    email?: string;  // Optional patient email for confirmation
    type: AppointmentType;
    date: string; // ISO datetime
    address?: string;
    notes?: string;
}

export interface AvailableSlot {
    time: string;   // HH:mm
    datetime: Date;
    available: boolean;
    remainingSlots?: number;  // How many slots still available
}

@Injectable()
export class AppointmentsService {
    private readonly logger = new Logger(AppointmentsService.name);

    constructor(
        private prisma: PrismaService,
        private notificationService: DynamicNotificationService,
        private emailService: EmailService,
    ) { }

    /**
     * Public: Book a new appointment
     */
    async bookAppointment(dto: BookAppointmentDto) {
        // 1. Get tenant with settings
        const tenant = await (this.prisma.tenant as any).findUnique({
            where: { id: dto.tenantId },
            select: {
                id: true,
                name: true,
                slug: true,
                phoneNumber: true,
                isHomeSamplingEnabled: true,
                appointmentDuration: true,
                openingTime: true,
                closingTime: true,
            },
        });

        if (!tenant) {
            throw new NotFoundException('Laboratory not found');
        }

        // 2. Validate HOME_SAMPLING is enabled
        if (dto.type === AppointmentType.HOME_SAMPLING && !tenant.isHomeSamplingEnabled) {
            throw new BadRequestException('Home sampling is not available for this laboratory');
        }

        // 3. Require address for home sampling
        if (dto.type === AppointmentType.HOME_SAMPLING && !dto.address) {
            throw new BadRequestException('Address is required for home sampling appointments');
        }

        // 4. Parse and validate date
        const appointmentDate = new Date(dto.date);
        if (isNaN(appointmentDate.getTime())) {
            throw new BadRequestException('Invalid date format');
        }

        // Check if slot is in the future
        if (appointmentDate < new Date()) {
            throw new BadRequestException('Cannot book appointments in the past');
        }

        // 5. Check if slot is free (simple check)
        const existingAppointment = await (this.prisma as any).appointment.findFirst({
            where: {
                tenantId: dto.tenantId,
                date: appointmentDate,
                status: { in: ['PENDING', 'CONFIRMED'] },
            },
        });

        if (existingAppointment) {
            throw new BadRequestException('This time slot is no longer available');
        }

        // 6. Create appointment
        const appointment = await (this.prisma as any).appointment.create({
            data: {
                tenantId: dto.tenantId,
                patientName: dto.name,
                patientPhone: this.normalizePhone(dto.phone),
                patientEmail: dto.email,
                type: dto.type,
                date: appointmentDate,
                address: dto.address,
                notes: dto.notes,
                status: 'PENDING',
            },
        });

        // Log creation to history
        await (this.prisma as any).appointmentHistory.create({
            data: {
                appointmentId: appointment.id,
                action: 'CREATED',
                newStatus: 'PENDING',
                changedBy: 'PATIENT',
                changedByName: dto.name,
                details: `Réservation créée par ${dto.name}`,
            },
        });

        this.logger.log(`New appointment booked: ${appointment.id} for tenant ${dto.tenantId}`);

        // 7. Send WhatsApp notifications (async, non-blocking)
        this.sendBookingNotifications(tenant, appointment).catch(err => {
            this.logger.error(`Failed to send booking notifications: ${err.message}`);
        });

        // 8. Send email confirmation if email provided
        if (dto.email) {
            this.emailService.sendAppointmentConfirmation({
                to: dto.email,
                patientName: dto.name,
                appointmentDate: appointmentDate,
                appointmentType: dto.type,
                tenantId: dto.tenantId,
                address: dto.address,
            }).catch(err => {
                this.logger.error(`Failed to send email confirmation: ${err.message}`);
            });
        }

        return {
            success: true,
            appointmentId: appointment.id,
            message: 'Votre demande de rendez-vous a été envoyée',
            appointment: {
                id: appointment.id,
                date: appointment.date,
                type: appointment.type,
                status: appointment.status,
            },
        };
    }

    /**
     * Get available time slots for a given date
     */
    async getAvailableSlots(tenantId: string, dateStr: string): Promise<AvailableSlot[]> {
        const tenant = await (this.prisma.tenant as any).findUnique({
            where: { id: tenantId },
            select: {
                openingTime: true,
                closingTime: true,
                appointmentDuration: true,
                maxAppointmentsPerSlot: true,
            },
        });

        if (!tenant) {
            throw new NotFoundException('Laboratory not found');
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            throw new BadRequestException('Invalid date format');
        }

        // Get all booked slots for this date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Check if this date is blocked
        const blockedSlots = await (this.prisma as any).blockedSlot.findMany({
            where: {
                tenantId,
                date: { gte: startOfDay, lte: endOfDay },
            },
        });

        // If there's an all-day block, return empty slots
        const allDayBlock = blockedSlots.find((b: any) => b.allDay);
        if (allDayBlock) {
            return []; // No slots available on blocked day
        }

        const bookedAppointments = await (this.prisma as any).appointment.findMany({
            where: {
                tenantId,
                date: { gte: startOfDay, lte: endOfDay },
                status: { in: ['PENDING', 'CONFIRMED'] },
            },
            select: { date: true },
        });

        // Count bookings per time slot (instead of just checking if booked)
        const slotBookingCounts = new Map<string, number>();
        bookedAppointments.forEach((a: any) => {
            const timeStr = `${String(a.date.getHours()).padStart(2, '0')}:${String(a.date.getMinutes()).padStart(2, '0')}`;
            slotBookingCounts.set(timeStr, (slotBookingCounts.get(timeStr) || 0) + 1);
        });

        const maxPerSlot = tenant.maxAppointmentsPerSlot || 1;

        // Build set of blocked time ranges
        const isTimeBlocked = (timeStr: string): boolean => {
            for (const block of blockedSlots) {
                if (block.allDay) return true;
                if (block.startTime && block.endTime) {
                    if (timeStr >= block.startTime && timeStr < block.endTime) {
                        return true;
                    }
                }
            }
            return false;
        };

        // Generate slots based on opening hours
        const slots: AvailableSlot[] = [];
        const [openHour, openMin] = tenant.openingTime.split(':').map(Number);
        const [closeHour, closeMin] = tenant.closingTime.split(':').map(Number);
        const duration = tenant.appointmentDuration || 15;

        let currentTime = openHour * 60 + openMin; // in minutes
        const closeTime = closeHour * 60 + closeMin;

        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        while (currentTime < closeTime) {
            const hour = Math.floor(currentTime / 60);
            const minute = currentTime % 60;
            const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

            const slotDate = new Date(date);
            slotDate.setHours(hour, minute, 0, 0);

            // Check if slot is in the past (for today)
            const isPast = isToday && slotDate < now;
            const bookingCount = slotBookingCounts.get(timeStr) || 0;
            const isFull = bookingCount >= maxPerSlot;
            const isBlocked = isTimeBlocked(timeStr);

            slots.push({
                time: timeStr,
                datetime: slotDate,
                available: !isPast && !isFull && !isBlocked,
                remainingSlots: Math.max(0, maxPerSlot - bookingCount),
            });

            currentTime += duration;
        }

        return slots;
    }

    /**
     * Admin: Get appointments with filters
     */
    async getAppointments(
        tenantId: string,
        options: { startDate?: string; endDate?: string; status?: AppointmentStatus }
    ) {
        const where: any = { tenantId };

        if (options.startDate) {
            where.date = { ...where.date, gte: new Date(options.startDate) };
        }
        if (options.endDate) {
            where.date = { ...where.date, lte: new Date(options.endDate) };
        }
        if (options.status) {
            where.status = options.status;
        }

        return (this.prisma as any).appointment.findMany({
            where,
            orderBy: { date: 'asc' },
        });
    }

    /**
     * Admin: Update appointment status
     */
    async updateStatus(
        tenantId: string,
        appointmentId: string,
        status: AppointmentStatus,
        userId?: string,
        userName?: string
    ) {
        const appointment = await (this.prisma as any).appointment.findFirst({
            where: { id: appointmentId, tenantId },
            include: { tenant: true },
        });

        if (!appointment) {
            throw new NotFoundException('Appointment not found');
        }

        const oldStatus = appointment.status;

        const updated = await (this.prisma as any).appointment.update({
            where: { id: appointmentId },
            data: { status },
        });

        // Log to history
        await (this.prisma as any).appointmentHistory.create({
            data: {
                appointmentId,
                action: 'STATUS_CHANGED',
                oldStatus,
                newStatus: status,
                changedBy: userId || 'SYSTEM',
                changedByName: userName || 'Système',
                details: `Statut changé de ${oldStatus} à ${status}`,
            },
        });

        this.logger.log(`Appointment ${appointmentId} status updated to ${status}`);

        // Send WhatsApp notification for status change
        if (status === 'CONFIRMED' || status === 'CANCELLED') {
            this.sendStatusNotification(appointment, status).catch(err => {
                this.logger.error(`Failed to send status notification: ${err.message}`);
            });
        }

        return updated;
    }

    /**
     * Get tenant settings for booking widget
     */
    async getTenantBookingSettings(slug: string) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { slug },
            select: {
                id: true,
                name: true,
                slug: true,
                brandColor: true,
                brandLogoUrl: true,
                openingTime: true,
                closingTime: true,
                appointmentDuration: true,
                isHomeSamplingEnabled: true,
                features: true,
            },
        });

        if (!tenant) {
            throw new NotFoundException('Laboratory not found');
        }

        // Check if appointment booking is enabled (via license)
        const hasAppointmentFeature = (tenant as any).features?.includes('APPOINTMENT_BOOKING');

        return {
            ...tenant,
            appointmentBookingEnabled: hasAppointmentFeature,
        };
    }

    // ==================== BLOCKED SLOTS MANAGEMENT ====================

    /**
     * Get all blocked slots for a tenant
     */
    async getBlockedSlots(tenantId: string) {
        return (this.prisma as any).blockedSlot.findMany({
            where: { tenantId },
            orderBy: { date: 'asc' },
        });
    }

    /**
     * Create a blocked slot
     */
    async createBlockedSlot(
        tenantId: string,
        data: { date: string; allDay?: boolean; startTime?: string; endTime?: string; reason?: string }
    ) {
        const blockedDate = new Date(data.date);
        blockedDate.setHours(0, 0, 0, 0);

        return (this.prisma as any).blockedSlot.create({
            data: {
                tenantId,
                date: blockedDate,
                allDay: data.allDay ?? true,
                startTime: data.startTime,
                endTime: data.endTime,
                reason: data.reason,
            },
        });
    }

    /**
     * Delete a blocked slot
     */
    async deleteBlockedSlot(tenantId: string, slotId: string) {
        // Verify ownership
        const slot = await (this.prisma as any).blockedSlot.findFirst({
            where: { id: slotId, tenantId },
        });

        if (!slot) {
            throw new NotFoundException('Blocked slot not found');
        }

        return (this.prisma as any).blockedSlot.delete({
            where: { id: slotId },
        });
    }

    // ==================== PRIVATE METHODS ====================

    private normalizePhone(phone: string): string {
        let normalized = phone.replace(/\D/g, '');
        if (normalized.startsWith('237') && normalized.length > 9) {
            normalized = normalized.substring(3);
        }
        return normalized;
    }

    private async sendBookingNotifications(tenant: any, appointment: any) {
        const dateFormatted = new Intl.DateTimeFormat('fr-CM', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(appointment.date));

        const typeText = appointment.type === 'HOME_SAMPLING' ? 'à domicile' : 'au laboratoire';

        // Send to patient
        const patientMessage = `🏥 ${tenant.name}\n\nVotre demande de RDV ${typeText} le ${dateFormatted} a été enregistrée.\n\nVous recevrez une confirmation prochainement.`;

        await this.notificationService.sendWhatsApp(
            tenant.id,
            appointment.patientPhone,
            patientMessage
        ).catch(() => { });

        // Send to lab admin
        if (tenant.phoneNumber) {
            const adminMessage = `📅 Nouveau RDV\n\nPatient: ${appointment.patientName}\nTél: ${appointment.patientPhone}\nType: ${typeText}\nDate: ${dateFormatted}${appointment.address ? `\nAdresse: ${appointment.address}` : ''}`;

            await this.notificationService.sendWhatsApp(
                tenant.id,
                tenant.phoneNumber,
                adminMessage
            ).catch(() => { });
        }
    }

    private async sendStatusNotification(appointment: any, status: AppointmentStatus) {
        const dateFormatted = new Intl.DateTimeFormat('fr-CM', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(appointment.date));

        let message: string;
        if (status === 'CONFIRMED') {
            message = `✅ RDV Confirmé\n\n${appointment.tenant.name}\n\nVotre rendez-vous du ${dateFormatted} est confirmé.\n\nÀ bientôt !`;
        } else {
            message = `❌ RDV Annulé\n\n${appointment.tenant.name}\n\nVotre rendez-vous du ${dateFormatted} a été annulé.\n\nContactez-nous pour reprogrammer.`;
        }

        await this.notificationService.sendWhatsApp(
            appointment.tenantId,
            appointment.patientPhone,
            message
        ).catch(() => { });
    }

    /**
     * Get appointment history/audit trail
     */
    async getAppointmentHistory(tenantId: string, appointmentId: string) {
        const appointment = await (this.prisma as any).appointment.findFirst({
            where: { id: appointmentId, tenantId },
        });

        if (!appointment) {
            throw new NotFoundException('Appointment not found');
        }

        const history = await (this.prisma as any).appointmentHistory.findMany({
            where: { appointmentId },
            orderBy: { createdAt: 'desc' },
        });

        return history;
    }

    /**
     * Generate iCal (.ics) content for an appointment
     */
    generateICalEvent(appointment: any, tenant: any): string {
        const startDate = new Date(appointment.date);
        const duration = tenant?.appointmentDuration || 15;
        const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

        const formatICalDate = (date: Date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const typeLabel = appointment.type === 'HOME_SAMPLING'
            ? 'Prélèvement à domicile'
            : 'Prélèvement au laboratoire';

        const location = appointment.type === 'HOME_SAMPLING' && appointment.address
            ? appointment.address
            : tenant?.address || '';

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//MedLabs//Appointment//FR',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            `UID:${appointment.id}@medlabs`,
            `DTSTAMP:${formatICalDate(new Date())}`,
            `DTSTART:${formatICalDate(startDate)}`,
            `DTEND:${formatICalDate(endDate)}`,
            `SUMMARY:RDV ${tenant?.name || 'Laboratoire'} - ${typeLabel}`,
            `DESCRIPTION:Patient: ${appointment.patientName}\\nType: ${typeLabel}${appointment.notes ? `\\nNotes: ${appointment.notes}` : ''}`,
            `LOCATION:${location.replace(/,/g, '\\,')}`,
            'STATUS:CONFIRMED',
            'BEGIN:VALARM',
            'TRIGGER:-P1D',
            'ACTION:DISPLAY',
            'DESCRIPTION:Rappel RDV laboratoire demain',
            'END:VALARM',
            'BEGIN:VALARM',
            'TRIGGER:-PT1H',
            'ACTION:DISPLAY',
            'DESCRIPTION:Rappel RDV laboratoire dans 1h',
            'END:VALARM',
            'END:VEVENT',
            'END:VCALENDAR',
        ].join('\r\n');

        return icsContent;
    }

    /**
     * Generate Google Calendar link
     */
    getGoogleCalendarLink(appointment: any, tenant: any): string {
        const startDate = new Date(appointment.date);
        const duration = tenant?.appointmentDuration || 15;
        const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

        const formatGoogleDate = (date: Date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const typeLabel = appointment.type === 'HOME_SAMPLING'
            ? 'Prélèvement à domicile'
            : 'Prélèvement au laboratoire';

        const title = encodeURIComponent(`RDV ${tenant?.name || 'Laboratoire'} - ${typeLabel}`);
        const details = encodeURIComponent(`Patient: ${appointment.patientName}\nType: ${typeLabel}${appointment.notes ? `\nNotes: ${appointment.notes}` : ''}`);
        const location = encodeURIComponent(appointment.type === 'HOME_SAMPLING' && appointment.address ? appointment.address : tenant?.address || '');

        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${details}&location=${location}`;
    }

    /**
     * Generate Outlook Calendar link (Office 365)
     */
    getOutlookCalendarLink(appointment: any, tenant: any): string {
        const startDate = new Date(appointment.date);
        const duration = tenant?.appointmentDuration || 15;
        const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

        const typeLabel = appointment.type === 'HOME_SAMPLING'
            ? 'Prélèvement à domicile'
            : 'Prélèvement au laboratoire';

        const title = encodeURIComponent(`RDV ${tenant?.name || 'Laboratoire'} - ${typeLabel}`);
        const body = encodeURIComponent(`Patient: ${appointment.patientName}\nType: ${typeLabel}${appointment.notes ? `\nNotes: ${appointment.notes}` : ''}`);
        const location = encodeURIComponent(appointment.type === 'HOME_SAMPLING' && appointment.address ? appointment.address : tenant?.address || '');

        return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${body}&location=${location}&allday=false`;
    }
}

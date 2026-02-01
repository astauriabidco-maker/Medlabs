import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { DynamicNotificationService } from '../notifications/dynamic-notification.service';

@Injectable()
export class AppointmentRemindersService {
    private readonly logger = new Logger(AppointmentRemindersService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationService: DynamicNotificationService,
    ) { }

    /**
     * Run every 15 minutes to check for appointments needing reminders
     */
    @Cron(CronExpression.EVERY_10_MINUTES)
    async handleReminders() {
        this.logger.debug('Checking for appointment reminders...');

        try {
            await this.sendDayBeforeReminders();
            await this.sendHoursBeforeReminders();
        } catch (error) {
            this.logger.error('Failed to process reminders:', error);
        }
    }

    /**
     * Send reminders for appointments tomorrow (J-1)
     * Target: Appointments between 24-26 hours from now
     */
    private async sendDayBeforeReminders() {
        const now = new Date();
        const tomorrow24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const tomorrow26h = new Date(now.getTime() + 26 * 60 * 60 * 1000);

        const appointments = await (this.prisma as any).appointment.findMany({
            where: {
                status: 'CONFIRMED',
                date: {
                    gte: tomorrow24h,
                    lt: tomorrow26h,
                },
                reminderDayBeforeSent: null,
            },
            include: { tenant: true },
        });

        this.logger.debug(`Found ${appointments.length} appointments needing J-1 reminder`);

        for (const apt of appointments) {
            await this.sendReminder(apt, 'DAY_BEFORE');
        }
    }

    /**
     * Send reminders for appointments in 2 hours (H-2)
     * Target: Appointments between 2-2.5 hours from now
     */
    private async sendHoursBeforeReminders() {
        const now = new Date();
        const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const in2h30 = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);

        const appointments = await (this.prisma as any).appointment.findMany({
            where: {
                status: 'CONFIRMED',
                date: {
                    gte: in2h,
                    lt: in2h30,
                },
                reminderHoursBeforeSent: null,
            },
            include: { tenant: true },
        });

        this.logger.debug(`Found ${appointments.length} appointments needing H-2 reminder`);

        for (const apt of appointments) {
            await this.sendReminder(apt, 'HOURS_BEFORE');
        }
    }

    /**
     * Send a reminder via WhatsApp and mark as sent
     */
    private async sendReminder(
        appointment: any,
        type: 'DAY_BEFORE' | 'HOURS_BEFORE'
    ) {
        const dateFormatted = new Intl.DateTimeFormat('fr-CM', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(appointment.date));

        const timeOnly = new Intl.DateTimeFormat('fr-CM', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(appointment.date));

        let message: string;

        if (type === 'DAY_BEFORE') {
            message = `📅 Rappel RDV demain\n\n${appointment.tenant.name}\n\nVotre rendez-vous est prévu demain à ${timeOnly}.\n\n${appointment.type === 'HOME_SAMPLING' ? 'Un préleveur viendra à votre domicile.' : 'Merci de vous présenter au laboratoire.'}`;
        } else {
            message = `⏰ Rappel RDV dans 2h\n\n${appointment.tenant.name}\n\nVotre rendez-vous est dans 2 heures (${timeOnly})!\n\n${appointment.type === 'HOME_SAMPLING' ? 'Un préleveur arrive bientôt.' : 'Merci de vous préparer.'}`;
        }

        try {
            // Send WhatsApp
            const result = await this.notificationService.sendWhatsApp(
                appointment.tenantId,
                appointment.patientPhone,
                message
            );

            if (!result.success) {
                // Fallback to SMS
                await this.notificationService.sendSms(
                    appointment.tenantId,
                    appointment.patientPhone,
                    message
                );
            }

            // Mark reminder as sent
            const updateData = type === 'DAY_BEFORE'
                ? { reminderDayBeforeSent: new Date() }
                : { reminderHoursBeforeSent: new Date() };

            await (this.prisma as any).appointment.update({
                where: { id: appointment.id },
                data: updateData,
            });

            this.logger.log(`${type} reminder sent to ${appointment.patientPhone} for appointment ${appointment.id}`);
        } catch (error) {
            this.logger.error(`Failed to send ${type} reminder for ${appointment.id}:`, error);
        }
    }
}

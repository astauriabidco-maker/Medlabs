import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma.service';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(
        private readonly mailerService: MailerService,
        private readonly prisma: PrismaService,
    ) { }

    async sendTestEmail(targetEmail: string): Promise<void> {
        await this.mailerService.sendMail({
            to: targetEmail,
            subject: 'MedLab - Test Email',
            template: 'result-notification', // Reuse a template for test
            context: {
                subject: 'Test delivery',
                patientName: 'Admin',
                date: new Date().toLocaleDateString(),
                folderRef: 'TEST-001',
                magicLink: '#',
                labName: 'MedLab Global',
                layout: 'layouts/main',
            },
        });
        this.logger.log(`Test email sent to ${targetEmail}`);
    }

    async sendResultNotification(params: {
        to: string;
        patientName: string;
        folderRef: string;
        date: string;
        magicLink: string;
        tenantId: string;
    }) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: params.tenantId },
        });

        const labName = tenant?.name || 'Votre Laboratoire';
        // Fallback or specific logo if stored in config/DB
        const labLogoUrl = null;

        await this.mailerService.sendMail({
            to: params.to,
            subject: `Résultat disponible : Dossier ${params.folderRef}`,
            template: 'result-notification',
            context: {
                patientName: params.patientName,
                folderRef: params.folderRef,
                date: params.date,
                magicLink: params.magicLink,
                labName,
                labLogoUrl,
                layout: 'layouts/main',
            },
        });

        this.logger.log(`Result notification email sent to ${params.to} for ${labName}`);
    }

    async sendAdminInvitation(params: {
        to: string;
        labName: string;
        setupLink: string;
    }) {
        await this.mailerService.sendMail({
            to: params.to,
            subject: `Invitation à rejoindre MedLab - ${params.labName}`,
            template: 'admin-invite',
            context: {
                platformName: 'MedLab',
                labName: params.labName,
                setupLink: params.setupLink,
                layout: 'layouts/main',
            },
        });

        this.logger.log(`Admin invitation email sent to ${params.to} for ${params.labName}`);
    }

    async sendPasswordReset(to: string, resetLink: string) {
        await this.mailerService.sendMail({
            to,
            subject: 'Réinitialisation de votre mot de passe MedLab',
            template: 'password-reset', // Must match the filename in templates/
            context: {
                resetLink,
                layout: 'layouts/main',
            },
        });
        this.logger.log(`Password reset email sent to ${to}`);
    }

    /**
     * Send appointment confirmation email to patient
     */
    async sendAppointmentConfirmation(params: {
        to: string;
        patientName: string;
        appointmentDate: Date;
        appointmentType: string;
        tenantId: string;
        address?: string;
    }) {
        try {
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: params.tenantId },
            });

            const labName = tenant?.name || 'Votre Laboratoire';

            const formattedDate = params.appointmentDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
            const formattedTime = params.appointmentDate.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
            });

            const typeLabel = params.appointmentType === 'HOME_SAMPLING'
                ? 'Prélèvement à domicile'
                : 'Prélèvement au laboratoire';

            await this.mailerService.sendMail({
                to: params.to,
                subject: `✅ Confirmation de votre rendez-vous - ${labName}`,
                template: 'appointment-confirmation',
                context: {
                    patientName: params.patientName,
                    labName,
                    date: formattedDate,
                    time: formattedTime,
                    type: typeLabel,
                    address: params.address,
                    layout: 'layouts/main',
                },
            });

            this.logger.log(`Appointment confirmation email sent to ${params.to} for ${labName}`);
            return { success: true };
        } catch (error: any) {
            this.logger.error(`Failed to send appointment confirmation: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

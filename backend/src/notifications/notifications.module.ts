import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { SmsService } from './sms.service';
import { EmailService } from './email.service';
import { WhatsAppService } from './whatsapp.service';
import { DynamicNotificationService } from './dynamic-notification.service';
import { DynamicConfigService } from '../dynamic-config.service';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../shared/encryption.service';

@Module({
    imports: [
        MailerModule.forRootAsync({
            useFactory: (config: DynamicConfigService) => ({
                transport: {
                    host: config.get('smtp.host'),
                    port: config.get('smtp.port'),
                    secure: config.get<boolean>('smtp.secure'), // Cast internally handling 'true' string
                    auth: {
                        user: config.get('smtp.user'),
                        pass: config.get('smtp.password'),
                    },
                },
                defaults: {
                    from: `"MedLab" <${config.get('smtp.from_email')}>`,
                },
                template: {
                    dir: join(__dirname, 'templates'),
                    adapter: new HandlebarsAdapter(),
                    options: {
                        strict: true,
                    },
                },
                options: {
                    partials: {
                        dir: join(__dirname, 'templates', 'partials'),
                        options: {
                            strict: true,
                        },
                    },
                },
            }),
            inject: [DynamicConfigService],
        }),
    ],
    providers: [SmsService, EmailService, WhatsAppService, DynamicNotificationService, EncryptionService],
    exports: [SmsService, EmailService, WhatsAppService, DynamicNotificationService],
})
export class NotificationsModule { }


import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentRemindersService } from './appointment-reminders.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [AuthModule, NotificationsModule],
    controllers: [AppointmentsController],
    providers: [AppointmentsService, AppointmentRemindersService, PrismaService],
    exports: [AppointmentsService],
})
export class AppointmentsModule { }


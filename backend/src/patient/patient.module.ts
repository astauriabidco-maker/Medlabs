import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PatientAuthController } from './auth.controller';
import { PatientHistoryController } from './history.controller';
import { PatientAuthService } from './auth.service';
import { PatientAuthGuard } from './patient-auth.guard';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
            signOptions: { expiresIn: '24h' },
        }),
        NotificationsModule,
    ],
    controllers: [PatientAuthController, PatientHistoryController],
    providers: [PatientAuthService, PatientAuthGuard, PrismaService],
    exports: [PatientAuthService, PatientAuthGuard],
})
export class PatientModule { }

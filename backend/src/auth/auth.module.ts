import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaService } from '../prisma.service';
import { StorageModule } from '../storage/storage.module';
import { MagicLinkService } from './magic-link.service';
import { PatientAuthController } from './patient-auth.controller';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    NotificationsModule,
    StorageModule,
    PassportModule,
    JwtModule.register({}), // We provide secret/options dynamically or globally if preferred, but dynamic in service is fine
  ],
  controllers: [PatientAuthController, AuthController],
  providers: [MagicLinkService, PrismaService, AuthService, JwtStrategy],
  exports: [MagicLinkService, AuthService],
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PaymentController } from './payment.controller';
import { PaymentProviderFactory } from './payment-provider.factory';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, JwtModule.register({})],
  controllers: [PaymentController],
  providers: [PaymentProviderFactory, PrismaService],
  exports: [PaymentProviderFactory],
})
export class PaymentModule {}

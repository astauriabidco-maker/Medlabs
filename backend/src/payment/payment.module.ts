import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentProviderFactory } from './payment-provider.factory';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [AuthModule],
    controllers: [PaymentController],
    providers: [PaymentProviderFactory, PrismaService],
    exports: [PaymentProviderFactory],
})
export class PaymentModule { }

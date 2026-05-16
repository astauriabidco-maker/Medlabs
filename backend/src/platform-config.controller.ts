import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from './auth/guards';
import { DynamicConfigService } from './dynamic-config.service';
import { EmailService } from './notifications/email.service';
import { SmsService } from './notifications/sms.service';

interface PlatformConfigBody {
  sms?: {
    provider?: string;
    apiKey?: string;
    apiSecret?: string;
    baseUrl?: string;
  };
  smtp?: {
    host?: string;
    port?: string | number;
    secure?: boolean;
    user?: string;
    password?: string;
    fromEmail?: string;
  };
  retention?: {
    defaultDays?: string | number;
    maxDays?: string | number;
  };
  general?: {
    maintenanceMode?: boolean;
    globalAnnouncement?: string;
  };
}

@Controller('admin/config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformConfigController {
  constructor(
    private dynamicConfig: DynamicConfigService,
    private emailService: EmailService,
    private smsService: SmsService,
  ) {}

  @Get()
  @Roles('SUPER_ADMIN')
  getConfig() {
    // Return masked values for secrets
    // This is a simplified version
    return {
      sms: {
        provider: this.dynamicConfig.get('sms.provider') || 'twilio',
        apiKey: this.dynamicConfig.get('sms.api_key') || '',
        apiSecret: '••••••••••••',
        baseUrl: this.dynamicConfig.get('sms.base_url') || '',
      },
      smtp: {
        host: this.dynamicConfig.get('smtp.host') || '',
        port: this.dynamicConfig.get('smtp.port') || 587,
        secure: this.dynamicConfig.get('smtp.secure') || true,
        user: this.dynamicConfig.get('smtp.user') || '',
        password: '••••••••••••',
        fromEmail: this.dynamicConfig.get('smtp.from_email') || '',
      },
      retention: {
        defaultDays:
          Number(this.dynamicConfig.get('retention.default_days')) || 30,
        maxDays: Number(this.dynamicConfig.get('retention.max_days')) || 90,
      },
      general: {
        maintenanceMode: this.dynamicConfig.get('MAINTENANCE_MODE') === 'true',
        globalAnnouncement: this.dynamicConfig.get('GLOBAL_ANNOUNCEMENT') || '',
      },
    };
  }

  @Post('save')
  @Roles('SUPER_ADMIN')
  async saveConfig(@Body() body: PlatformConfigBody) {
    if (body.sms) {
      if (body.sms.provider)
        await this.dynamicConfig.set('sms.provider', body.sms.provider);
      if (body.sms.apiKey)
        await this.dynamicConfig.set('sms.api_key', body.sms.apiKey);
      if (body.sms.apiSecret && body.sms.apiSecret !== '••••••••••••') {
        await this.dynamicConfig.set(
          'sms.api_secret',
          body.sms.apiSecret,
          true,
        );
      }
      if (body.sms.baseUrl)
        await this.dynamicConfig.set('sms.base_url', body.sms.baseUrl);
    }

    if (body.smtp) {
      if (body.smtp.host)
        await this.dynamicConfig.set('smtp.host', body.smtp.host);
      if (body.smtp.port)
        await this.dynamicConfig.set('smtp.port', String(body.smtp.port));
      if (body.smtp.secure !== undefined)
        await this.dynamicConfig.set('smtp.secure', String(body.smtp.secure));
      if (body.smtp.user)
        await this.dynamicConfig.set('smtp.user', body.smtp.user);
      if (body.smtp.password && body.smtp.password !== '••••••••••••') {
        await this.dynamicConfig.set('smtp.password', body.smtp.password, true);
      }
      if (body.smtp.fromEmail)
        await this.dynamicConfig.set('smtp.from_email', body.smtp.fromEmail);
    }

    if (body.retention) {
      if (body.retention.defaultDays)
        await this.dynamicConfig.set(
          'retention.default_days',
          String(body.retention.defaultDays),
        );
      if (body.retention.maxDays)
        await this.dynamicConfig.set(
          'retention.max_days',
          String(body.retention.maxDays),
        );
    }

    if (body.general) {
      await this.dynamicConfig.set(
        'MAINTENANCE_MODE',
        String(body.general.maintenanceMode),
      );
      await this.dynamicConfig.set(
        'GLOBAL_ANNOUNCEMENT',
        body.general.globalAnnouncement || '',
      );
    }

    return { success: true };
  }

  @Post('test-sms')
  @Roles('SUPER_ADMIN')
  async testSms(@Body('phone') phone: string) {
    await this.smsService.sendOtp(phone || '+237600000000', 'TEST-123');
    return { success: true, message: 'Test SMS sent' };
  }

  @Post('test-email')
  @Roles('SUPER_ADMIN')
  async testEmail(@Body('email') email: string) {
    await this.emailService.sendTestEmail(email || 'admin@medlab.cm');
    return { success: true, message: 'Test email sent' };
  }
}

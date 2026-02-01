import {
    Controller,
    Post,
    Body,
    UseGuards,
    Request,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards';

/**
 * API Controller for WhatsApp Business operations
 * These endpoints require authentication unlike the webhook
 */
@Controller('api/notifications/whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppApiController {
    constructor(private readonly whatsappService: WhatsAppService) { }

    /**
     * Send a test WhatsApp message
     * Uses the hello_world template
     */
    @Post('test')
    async sendTestMessage(
        @Request() req: any,
        @Body() body: { phone: string },
    ) {
        const tenantId = req.user.tenantId;

        if (!body.phone) {
            throw new HttpException('Phone number is required', HttpStatus.BAD_REQUEST);
        }

        const result = await this.whatsappService.sendTestMessage(tenantId, body.phone);

        if (result.success) {
            return { success: true, message: 'Test message sent' };
        }

        throw new HttpException(result.error || 'Failed to send message', HttpStatus.BAD_REQUEST);
    }
}

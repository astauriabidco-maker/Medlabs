import {
    Controller,
    Get,
    Put,
    Post,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, User } from '../auth/guards';
import { IntegrationsService } from './integrations.service';


interface SaveIntegrationDto {
    provider: 'TWILIO' | 'META' | 'ORANGE';
    accountId: string;
    authToken: string;
    phoneNumber: string;
    smsEnabled?: boolean;
    whatsappEnabled?: boolean;
    isActive?: boolean;
}

@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegrationsController {
    constructor(private readonly integrationsService: IntegrationsService) { }

    /**
     * Get current tenant integration configuration
     */
    @Get()
    @Roles('LAB_ADMIN')
    async getIntegration(@User() user: any) {
        if (!user.tenantId) {
            throw new BadRequestException('Tenant context required');
        }
        return this.integrationsService.getIntegration(user.tenantId);
    }

    /**
     * Save or update tenant integration configuration
     */
    @Put()
    @Roles('LAB_ADMIN')
    async saveIntegration(@User() user: any, @Body() dto: SaveIntegrationDto) {
        if (!user.tenantId) {
            throw new BadRequestException('Tenant context required');
        }

        // Validate required fields
        if (!dto.accountId || !dto.authToken || !dto.phoneNumber) {
            throw new BadRequestException('Account ID, Auth Token, and Phone Number are required');
        }

        return this.integrationsService.saveIntegration(user.tenantId, dto);
    }

    /**
     * Test the integration connection
     */
    @Post('test')
    @Roles('LAB_ADMIN')
    @HttpCode(HttpStatus.OK)
    async testConnection(@User() user: any) {
        if (!user.tenantId) {
            throw new BadRequestException('Tenant context required');
        }
        return this.integrationsService.testConnection(user.tenantId);
    }

    /**
     * Delete integration (revert to platform defaults)
     */
    @Post('reset')
    @Roles('LAB_ADMIN')
    @HttpCode(HttpStatus.OK)
    async resetIntegration(@User() user: any) {
        if (!user.tenantId) {
            throw new BadRequestException('Tenant context required');
        }
        return this.integrationsService.deleteIntegration(user.tenantId);
    }
}

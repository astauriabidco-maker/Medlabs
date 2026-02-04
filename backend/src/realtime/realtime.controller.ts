import { Controller, Get, UseGuards } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Realtime')
@ApiBearerAuth()
@Controller('realtime')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RealtimeController {
    constructor(private readonly realtimeGateway: RealtimeGateway) { }

    /**
     * Get connected clients stats (admin only)
     */
    @Get('stats')
    @Roles('SUPER_ADMIN', 'PLATFORM_MANAGER')
    @ApiOperation({ summary: 'Get realtime connection statistics' })
    getStats() {
        return this.realtimeGateway.getConnectedClients();
    }

    /**
     * Get WebSocket connection info
     */
    @Get('info')
    @Roles('LAB_ADMIN', 'TECHNICIAN', 'MANAGER')
    @ApiOperation({ summary: 'Get WebSocket connection info' })
    getConnectionInfo() {
        return {
            endpoint: '/realtime',
            protocol: 'socket.io',
            events: {
                // Client can subscribe to:
                subscribe: ['subscribe:alerts', 'subscribe:results'],
                // Client will receive:
                receive: ['newResult', 'alertTriggered', 'statusChanged', 'notification'],
                // Client can send:
                send: ['ping'],
            },
            authentication: 'Bearer token in query param or Authorization header',
        };
    }
}

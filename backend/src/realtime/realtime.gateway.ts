import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface ClientInfo {
    socketId: string;
    userId: string;
    tenantId: string;
    connectedAt: Date;
}

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    namespace: '/realtime',
})
@Injectable()
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(RealtimeGateway.name);
    private clients: Map<string, ClientInfo> = new Map();
    private tenantRooms: Map<string, Set<string>> = new Map();

    @WebSocketServer()
    server: Server;

    constructor(private readonly jwtService: JwtService) { }

    afterInit(server: Server) {
        this.logger.log('WebSocket Gateway initialized');
    }

    async handleConnection(client: Socket) {
        try {
            // Extract token from query or headers
            const token = client.handshake.query.token as string ||
                client.handshake.headers.authorization?.replace('Bearer ', '');

            if (!token) {
                this.logger.warn(`Client ${client.id} connection rejected: No token`);
                client.disconnect();
                return;
            }

            // Verify JWT
            const decoded = this.jwtService.verify(token);
            const { sub: userId, tenantId } = decoded;

            // Store client info
            this.clients.set(client.id, {
                socketId: client.id,
                userId,
                tenantId,
                connectedAt: new Date(),
            });

            // Join tenant room
            if (tenantId) {
                client.join(`tenant:${tenantId}`);

                const room = this.tenantRooms.get(tenantId) || new Set();
                room.add(client.id);
                this.tenantRooms.set(tenantId, room);
            }

            // Join user room
            client.join(`user:${userId}`);

            this.logger.log(`Client connected: ${client.id} (User: ${userId}, Tenant: ${tenantId})`);

            // Send welcome message
            client.emit('connected', {
                message: 'Connected to MedLabs Realtime',
                timestamp: new Date(),
            });

        } catch (error: any) {
            this.logger.warn(`Client ${client.id} connection rejected: ${error.message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        const clientInfo = this.clients.get(client.id);

        if (clientInfo) {
            // Remove from tenant room
            const room = this.tenantRooms.get(clientInfo.tenantId);
            if (room) {
                room.delete(client.id);
                if (room.size === 0) {
                    this.tenantRooms.delete(clientInfo.tenantId);
                }
            }
        }

        this.clients.delete(client.id);
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    // ===== SUBSCRIPTION HANDLERS =====

    @SubscribeMessage('subscribe:alerts')
    handleSubscribeAlerts(@ConnectedSocket() client: Socket) {
        const clientInfo = this.clients.get(client.id);
        if (clientInfo) {
            client.join(`alerts:${clientInfo.tenantId}`);
            return { subscribed: 'alerts', success: true };
        }
        return { subscribed: 'alerts', success: false };
    }

    @SubscribeMessage('subscribe:results')
    handleSubscribeResults(@ConnectedSocket() client: Socket) {
        const clientInfo = this.clients.get(client.id);
        if (clientInfo) {
            client.join(`results:${clientInfo.tenantId}`);
            return { subscribed: 'results', success: true };
        }
        return { subscribed: 'results', success: false };
    }

    @SubscribeMessage('ping')
    handlePing(@ConnectedSocket() client: Socket) {
        return { event: 'pong', timestamp: new Date() };
    }

    // ===== BROADCAST METHODS (called by other services) =====

    /**
     * Broadcast a new result to all connected clients of a tenant
     */
    broadcastNewResult(tenantId: string, result: any) {
        this.server.to(`tenant:${tenantId}`).emit('newResult', {
            type: 'NEW_RESULT',
            data: result,
            timestamp: new Date(),
        });
        this.logger.debug(`Broadcasted new result to tenant ${tenantId}`);
    }

    /**
     * Broadcast a critical alert to all connected clients of a tenant
     */
    broadcastAlert(tenantId: string, alert: any) {
        this.server.to(`tenant:${tenantId}`).emit('alertTriggered', {
            type: 'ALERT',
            data: alert,
            timestamp: new Date(),
        });
        this.server.to(`alerts:${tenantId}`).emit('alertTriggered', {
            type: 'ALERT',
            data: alert,
            timestamp: new Date(),
        });
        this.logger.debug(`Broadcasted alert to tenant ${tenantId}`);
    }

    /**
     * Broadcast a status change to all connected clients
     */
    broadcastStatusChange(tenantId: string, documentId: string, status: string) {
        this.server.to(`tenant:${tenantId}`).emit('statusChanged', {
            type: 'STATUS_CHANGE',
            data: { documentId, status },
            timestamp: new Date(),
        });
    }

    /**
     * Send a notification to a specific user
     */
    notifyUser(userId: string, notification: any) {
        this.server.to(`user:${userId}`).emit('notification', {
            type: 'NOTIFICATION',
            data: notification,
            timestamp: new Date(),
        });
    }

    /**
     * Get connected clients count for admin dashboard
     */
    getConnectedClients(): { total: number; byTenant: Record<string, number> } {
        const byTenant: Record<string, number> = {};
        this.tenantRooms.forEach((clients, tenantId) => {
            byTenant[tenantId] = clients.size;
        });

        return {
            total: this.clients.size,
            byTenant,
        };
    }
}

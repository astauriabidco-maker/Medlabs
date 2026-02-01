import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Req,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { JwtAuthGuard } from '../auth/guards';
import { RequirePermissions, PermissionsGuard } from '../auth/permissions.guard';

@Controller('team')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TeamController {
    constructor(private teamService: TeamService) { }

    // ==================== ROLES ====================

    @Get('roles')
    @RequirePermissions('MANAGE_TEAM')
    async getRoles(@Req() req: any) {
        return this.teamService.getRoles(req.user.tenantId);
    }

    @Post('roles')
    @RequirePermissions('MANAGE_TEAM')
    async createRole(
        @Req() req: any,
        @Body() body: { name: string; description?: string; permissions: string[] },
    ) {
        return this.teamService.createRole(req.user.tenantId, body);
    }

    @Put('roles/:id')
    @RequirePermissions('MANAGE_TEAM')
    async updateRole(
        @Req() req: any,
        @Param('id') id: string,
        @Body() body: { name?: string; description?: string; permissions?: string[] },
    ) {
        return this.teamService.updateRole(req.user.tenantId, id, body);
    }

    @Delete('roles/:id')
    @RequirePermissions('MANAGE_TEAM')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteRole(@Req() req: any, @Param('id') id: string) {
        await this.teamService.deleteRole(req.user.tenantId, id);
    }

    // ==================== USERS ====================

    @Get('users')
    @RequirePermissions('MANAGE_TEAM')
    async getUsers(@Req() req: any) {
        return this.teamService.getUsers(req.user.tenantId);
    }

    @Post('users')
    @RequirePermissions('MANAGE_TEAM')
    async createUser(
        @Req() req: any,
        @Body() body: {
            email: string;
            password: string;
            firstName?: string;
            lastName?: string;
            customRoleId: string;
        },
    ) {
        return this.teamService.createUser(req.user.tenantId, body);
    }

    @Put('users/:id')
    @RequirePermissions('MANAGE_TEAM')
    async updateUser(
        @Req() req: any,
        @Param('id') id: string,
        @Body() body: {
            firstName?: string;
            lastName?: string;
            customRoleId?: string;
            status?: 'INVITED' | 'ACTIVE' | 'SUSPENDED';
        },
    ) {
        return this.teamService.updateUser(req.user.tenantId, id, body);
    }

    @Delete('users/:id')
    @RequirePermissions('MANAGE_TEAM')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteUser(@Req() req: any, @Param('id') id: string) {
        await this.teamService.deleteUser(req.user.tenantId, id, req.user.id);
    }

    // ==================== PERMISSIONS ====================

    @Get('permissions')
    @RequirePermissions('MANAGE_TEAM')
    getAvailablePermissions() {
        return this.teamService.getAvailablePermissions();
    }
}

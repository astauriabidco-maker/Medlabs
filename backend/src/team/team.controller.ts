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
import { RoleLimitsService, ROLE_METADATA } from './role-limits.service';
import { JwtAuthGuard } from '../auth/guards';
import {
  RequirePermissions,
  PermissionsGuard,
} from '../auth/permissions.guard';

interface AuthenticatedUser {
  id: string;
  tenantId: string;
}

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@Controller('team')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TeamController {
  constructor(
    private teamService: TeamService,
    private roleLimitsService: RoleLimitsService,
  ) {}

  // ==================== ROLE QUOTAS ====================

  @Get('quotas')
  @RequirePermissions('MANAGE_TEAM')
  async getRoleQuotas(@Req() req: AuthenticatedRequest) {
    return this.roleLimitsService.getTenantRoleQuotas(req.user.tenantId);
  }

  @Get('available-roles')
  @RequirePermissions('MANAGE_TEAM')
  async getAvailableRoles(@Req() req: AuthenticatedRequest) {
    return this.roleLimitsService.getAvailableRoles(req.user.tenantId);
  }

  @Get('role-metadata')
  @RequirePermissions('MANAGE_TEAM')
  getRoleMetadata() {
    return ROLE_METADATA;
  }

  // ==================== ROLES ====================

  @Get('roles')
  @RequirePermissions('MANAGE_TEAM')
  async getRoles(@Req() req: AuthenticatedRequest) {
    return this.teamService.getRoles(req.user.tenantId);
  }

  @Post('roles')
  @RequirePermissions('MANAGE_TEAM')
  async createRole(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name: string; description?: string; permissions: string[] },
  ) {
    return this.teamService.createRole(req.user.tenantId, body);
  }

  @Put('roles/:id')
  @RequirePermissions('MANAGE_TEAM')
  async updateRole(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: { name?: string; description?: string; permissions?: string[] },
  ) {
    return this.teamService.updateRole(req.user.tenantId, id, body);
  }

  @Delete('roles/:id')
  @RequirePermissions('MANAGE_TEAM')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.teamService.deleteRole(req.user.tenantId, id);
  }

  // ==================== USERS ====================

  @Get('users')
  @RequirePermissions('MANAGE_TEAM')
  async getUsers(@Req() req: AuthenticatedRequest) {
    return this.teamService.getUsers(req.user.tenantId);
  }

  @Post('users')
  @RequirePermissions('MANAGE_TEAM')
  async createUser(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      customRoleId: string;
      role?: string; // New: UserRole enum value
    },
  ) {
    // Validate role quota before creating user
    if (body.role) {
      const check = await this.roleLimitsService.canCreateUserWithRole(
        req.user.tenantId,
        body.role,
      );
      if (!check.allowed) {
        throw new Error(check.reason);
      }
    }
    return this.teamService.createUser(req.user.tenantId, body);
  }

  @Put('users/:id')
  @RequirePermissions('MANAGE_TEAM')
  async updateUser(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
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
  async deleteUser(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.teamService.deleteUser(req.user.tenantId, id, req.user.id);
  }

  // ==================== PERMISSIONS ====================

  @Get('permissions')
  @RequirePermissions('MANAGE_TEAM')
  getAvailablePermissions() {
    return this.teamService.getAvailablePermissions();
  }
}

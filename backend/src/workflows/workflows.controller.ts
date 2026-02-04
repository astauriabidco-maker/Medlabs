import { Controller, Post, Get, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { JwtAuthGuard, RolesGuard, Roles, User } from '../auth/guards';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { CreateWorkflowDto, UpdateWorkflowDto, ExecuteWorkflowDto } from './dto';

@ApiTags('Workflows')
@ApiBearerAuth()
@Controller('workflows')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkflowsController {
    constructor(private readonly workflowsService: WorkflowsService) { }

    /**
     * Create a new workflow rule
     */
    @Post()
    @Roles('LAB_ADMIN')
    @ApiOperation({ summary: 'Create a new workflow rule' })
    @ApiBody({ type: CreateWorkflowDto })
    createWorkflow(
        @User() user: any,
        @Body() body: CreateWorkflowDto,
    ) {
        return this.workflowsService.createWorkflow(user.tenantId, {
            name: body.name,
            description: body.description,
            trigger: body.trigger,
            conditions: body.conditions as any,
            actions: body.actions as any,
            isActive: body.isActive ?? true,
            priority: body.priority || 1,
        });
    }


    /**
     * Get all workflows for tenant
     */
    @Get()
    @Roles('LAB_ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'Get all workflow rules' })
    getWorkflows(@User() user: any) {
        return this.workflowsService.getWorkflows(user.tenantId);
    }

    /**
     * Get a specific workflow
     */
    @Get(':id')
    @Roles('LAB_ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'Get a specific workflow rule' })
    getWorkflow(@User() user: any, @Param('id') id: string) {
        return this.workflowsService.getWorkflow(user.tenantId, id);
    }

    /**
     * Update a workflow rule
     */
    @Patch(':id')
    @Roles('LAB_ADMIN')
    @ApiOperation({ summary: 'Update a workflow rule' })
    @ApiBody({ type: UpdateWorkflowDto })
    updateWorkflow(
        @User() user: any,
        @Param('id') id: string,
        @Body() body: UpdateWorkflowDto,
    ) {
        return this.workflowsService.updateWorkflow(user.tenantId, id, body as any);
    }

    /**
     * Delete a workflow rule
     */
    @Delete(':id')
    @Roles('LAB_ADMIN')
    @ApiOperation({ summary: 'Delete a workflow rule' })
    deleteWorkflow(@User() user: any, @Param('id') id: string) {
        return this.workflowsService.deleteWorkflow(user.tenantId, id);
    }

    /**
     * Execute a workflow manually (for testing)
     */
    @Post(':id/execute')
    @Roles('LAB_ADMIN')
    @ApiOperation({ summary: 'Execute a workflow manually' })
    executeWorkflow(
        @User() user: any,
        @Param('id') id: string,
        @Body() context: Record<string, any>,
    ) {
        return this.workflowsService.executeWorkflow(user.tenantId, id, context);
    }

    /**
     * Get execution logs
     */
    @Get('logs/history')
    @Roles('LAB_ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'Get workflow execution logs' })
    getExecutionLogs(@User() user: any, @Query('limit') limit?: number) {
        return this.workflowsService.getExecutionLogs(user.tenantId, limit || 20);
    }
}

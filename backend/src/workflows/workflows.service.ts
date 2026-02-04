import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { AuditAction } from '@prisma/client';

// Export types for controller
export interface WorkflowRule {
    id: string;
    name: string;
    description?: string;
    trigger: 'ON_RESULT_UPLOAD' | 'ON_CRITICAL_VALUE' | 'ON_STATUS_CHANGE' | 'SCHEDULED';
    conditions: WorkflowCondition[];
    actions: WorkflowAction[];
    isActive: boolean;
    priority: number;
}

export interface WorkflowCondition {
    field: string;
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'regex';
    value: string | number;
}

export interface WorkflowAction {
    type: 'SEND_EMAIL' | 'SEND_SMS' | 'CREATE_ALERT' | 'UPDATE_STATUS' | 'NOTIFY_USER' | 'WEBHOOK';
    config: Record<string, any>;
}

export interface ExecutionLog {
    ruleId: string;
    ruleName: string;
    triggeredAt: Date;
    conditionsMet: boolean;
    actionsExecuted: string[];
    result: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    error?: string;
}

@Injectable()
export class WorkflowsService {
    // In-memory storage for workflows (would use DB in production)
    private workflows: Map<string, WorkflowRule[]> = new Map();
    private executionLogs: Map<string, ExecutionLog[]> = new Map();

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create a new workflow rule
     */
    async createWorkflow(tenantId: string, rule: Omit<WorkflowRule, 'id'>) {
        const workflows = this.workflows.get(tenantId) || [];

        const newRule: WorkflowRule = {
            id: uuidv4(),
            ...rule,
            priority: rule.priority || workflows.length + 1,
        };

        workflows.push(newRule);
        this.workflows.set(tenantId, workflows);

        return {
            success: true,
            workflow: newRule,
            message: 'Workflow rule created successfully',
        };
    }

    /**
     * Get all workflows for a tenant
     */
    async getWorkflows(tenantId: string) {
        const workflows = this.workflows.get(tenantId) || [];
        return {
            total: workflows.length,
            workflows: workflows.sort((a, b) => a.priority - b.priority),
        };
    }

    /**
     * Get a specific workflow
     */
    async getWorkflow(tenantId: string, workflowId: string) {
        const workflows = this.workflows.get(tenantId) || [];
        const workflow = workflows.find(w => w.id === workflowId);

        if (!workflow) throw new NotFoundException('Workflow not found');

        return workflow;
    }

    /**
     * Update a workflow rule
     */
    async updateWorkflow(tenantId: string, workflowId: string, updates: Partial<WorkflowRule>) {
        const workflows = this.workflows.get(tenantId) || [];
        const index = workflows.findIndex(w => w.id === workflowId);

        if (index === -1) throw new NotFoundException('Workflow not found');

        workflows[index] = { ...workflows[index], ...updates, id: workflowId };
        this.workflows.set(tenantId, workflows);

        return {
            success: true,
            workflow: workflows[index],
            message: 'Workflow updated successfully',
        };
    }

    /**
     * Delete a workflow rule
     */
    async deleteWorkflow(tenantId: string, workflowId: string) {
        const workflows = this.workflows.get(tenantId) || [];
        const index = workflows.findIndex(w => w.id === workflowId);

        if (index === -1) throw new NotFoundException('Workflow not found');

        workflows.splice(index, 1);
        this.workflows.set(tenantId, workflows);

        return {
            success: true,
            message: 'Workflow deleted successfully',
        };
    }

    /**
     * Execute a workflow manually (for testing)
     */
    async executeWorkflow(tenantId: string, workflowId: string, context: Record<string, any>) {
        const workflow = await this.getWorkflow(tenantId, workflowId);

        if (!workflow.isActive) {
            throw new BadRequestException('Workflow is not active');
        }

        // Evaluate conditions
        const conditionsMet = this.evaluateConditions(workflow.conditions, context);

        // Execute actions if conditions met
        const actionsExecuted: string[] = [];
        let result: 'SUCCESS' | 'PARTIAL' | 'FAILED' = 'SUCCESS';
        let error: string | undefined;

        if (conditionsMet) {
            for (const action of workflow.actions) {
                try {
                    await this.executeAction(tenantId, action, context);
                    actionsExecuted.push(action.type);
                } catch (err: any) {
                    error = err.message;
                    result = actionsExecuted.length > 0 ? 'PARTIAL' : 'FAILED';
                }
            }
        }

        // Log execution
        const log: ExecutionLog = {
            ruleId: workflow.id,
            ruleName: workflow.name,
            triggeredAt: new Date(),
            conditionsMet,
            actionsExecuted,
            result: conditionsMet ? result : 'SUCCESS',
            error,
        };

        const logs = this.executionLogs.get(tenantId) || [];
        logs.unshift(log);
        this.executionLogs.set(tenantId, logs.slice(0, 100)); // Keep last 100 logs

        return {
            execution: log,
            message: conditionsMet
                ? `Workflow executed: ${actionsExecuted.length} actions performed`
                : 'Conditions not met, no actions executed',
        };
    }

    /**
     * Get execution logs
     */
    async getExecutionLogs(tenantId: string, limit: number = 20) {
        const logs = this.executionLogs.get(tenantId) || [];
        return {
            total: logs.length,
            logs: logs.slice(0, limit),
        };
    }

    /**
     * Evaluate workflow conditions
     */
    private evaluateConditions(conditions: WorkflowCondition[], context: Record<string, any>): boolean {
        return conditions.every(condition => {
            const value = context[condition.field];
            switch (condition.operator) {
                case 'equals':
                    return value === condition.value;
                case 'contains':
                    return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
                case 'greaterThan':
                    return Number(value) > Number(condition.value);
                case 'lessThan':
                    return Number(value) < Number(condition.value);
                case 'regex':
                    return new RegExp(String(condition.value)).test(String(value));
                default:
                    return true;
            }
        });
    }

    /**
     * Execute a workflow action
     */
    private async executeAction(tenantId: string, action: WorkflowAction, context: Record<string, any>) {
        switch (action.type) {
            case 'CREATE_ALERT':
                // Log alert as audit entry since Alert model doesn't exist
                await this.prisma.auditLog.create({
                    data: {
                        tenantId,
                        action: AuditAction.UPDATE_SETTINGS,
                        description: `[WORKFLOW ALERT] ${action.config.title || 'Alert'}: ${action.config.message || 'Automated alert'}`,
                        resourceId: context.documentId || null,
                        actorId: null,
                    },
                });
                break;
            case 'UPDATE_STATUS':
                if (context.documentId) {
                    await this.prisma.document.update({
                        where: { id: context.documentId },
                        data: { status: action.config.status },
                    });
                }
                break;
            case 'SEND_EMAIL':
            case 'SEND_SMS':
            case 'NOTIFY_USER':
            case 'WEBHOOK':
                // These would be implemented with actual notification services
                console.log(`[Workflow] Action ${action.type} triggered:`, action.config);
                break;
        }
    }
}

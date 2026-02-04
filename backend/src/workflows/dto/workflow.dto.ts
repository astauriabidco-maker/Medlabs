/**
 * Workflow DTOs with class-validator validation
 * Used by: workflows.controller.ts
 */
import {
    IsString,
    IsOptional,
    IsEnum,
    IsBoolean,
    IsInt,
    IsArray,
    ValidateNested,
    Min,
    Max,
    IsNotEmpty,
    ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enums
export enum WorkflowTrigger {
    ON_RESULT_UPLOAD = 'ON_RESULT_UPLOAD',
    ON_CRITICAL_VALUE = 'ON_CRITICAL_VALUE',
    ON_STATUS_CHANGE = 'ON_STATUS_CHANGE',
    SCHEDULED = 'SCHEDULED',
}

export enum ConditionOperator {
    EQUALS = 'EQUALS',
    NOT_EQUALS = 'NOT_EQUALS',
    CONTAINS = 'CONTAINS',
    GREATER_THAN = 'GREATER_THAN',
    LESS_THAN = 'LESS_THAN',
    STARTS_WITH = 'STARTS_WITH',
    ENDS_WITH = 'ENDS_WITH',
}

export enum ActionType {
    SEND_SMS = 'SEND_SMS',
    SEND_WHATSAPP = 'SEND_WHATSAPP',
    SEND_EMAIL = 'SEND_EMAIL',
    NOTIFY_USER = 'NOTIFY_USER',
    CREATE_ALERT = 'CREATE_ALERT',
    WEBHOOK = 'WEBHOOK',
}

// Nested DTOs
export class WorkflowConditionDto {
    @ApiProperty({ description: 'Field to evaluate', example: 'patientName' })
    @IsString()
    @IsNotEmpty()
    field: string;

    @ApiProperty({ enum: ConditionOperator, description: 'Comparison operator' })
    @IsEnum(ConditionOperator)
    operator: ConditionOperator;

    @ApiProperty({ description: 'Value to compare against', example: 'urgent' })
    @IsNotEmpty()
    value: string | number;
}

export class WorkflowActionConfigDto {
    @ApiPropertyOptional({ description: 'Template ID for notifications' })
    @IsOptional()
    @IsString()
    templateId?: string;

    @ApiPropertyOptional({ description: 'Recipient for the action' })
    @IsOptional()
    @IsString()
    recipient?: string;

    @ApiPropertyOptional({ description: 'Webhook URL for external calls' })
    @IsOptional()
    @IsString()
    webhookUrl?: string;

    @ApiPropertyOptional({ description: 'Custom message content' })
    @IsOptional()
    @IsString()
    message?: string;
}

export class WorkflowActionDto {
    @ApiProperty({ enum: ActionType, description: 'Type of action to execute' })
    @IsEnum(ActionType)
    type: ActionType;

    @ApiProperty({ type: WorkflowActionConfigDto, description: 'Action configuration' })
    @ValidateNested()
    @Type(() => WorkflowActionConfigDto)
    config: WorkflowActionConfigDto;
}

// Main DTOs
export class CreateWorkflowDto {
    @ApiProperty({ description: 'Workflow name', example: 'Notify on critical values' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ description: 'Workflow description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ enum: WorkflowTrigger, description: 'Event that triggers the workflow' })
    @IsEnum(WorkflowTrigger)
    trigger: WorkflowTrigger;

    @ApiProperty({ type: [WorkflowConditionDto], description: 'Conditions that must be met' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WorkflowConditionDto)
    @ArrayMinSize(1, { message: 'At least one condition is required' })
    conditions: WorkflowConditionDto[];

    @ApiProperty({ type: [WorkflowActionDto], description: 'Actions to execute when conditions are met' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WorkflowActionDto)
    @ArrayMinSize(1, { message: 'At least one action is required' })
    actions: WorkflowActionDto[];

    @ApiPropertyOptional({ description: 'Whether the workflow is active', default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ description: 'Execution priority (1=highest)', minimum: 1, maximum: 10 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(10)
    priority?: number;
}

export class UpdateWorkflowDto {
    @ApiPropertyOptional({ description: 'Workflow name' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Workflow description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ enum: WorkflowTrigger, description: 'Event that triggers the workflow' })
    @IsOptional()
    @IsEnum(WorkflowTrigger)
    trigger?: WorkflowTrigger;

    @ApiPropertyOptional({ type: [WorkflowConditionDto], description: 'Conditions that must be met' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WorkflowConditionDto)
    conditions?: WorkflowConditionDto[];

    @ApiPropertyOptional({ type: [WorkflowActionDto], description: 'Actions to execute' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WorkflowActionDto)
    actions?: WorkflowActionDto[];

    @ApiPropertyOptional({ description: 'Whether the workflow is active' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ description: 'Execution priority (1=highest)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(10)
    priority?: number;
}

export class ExecuteWorkflowDto {
    @ApiPropertyOptional({ description: 'Execution context data' })
    @IsOptional()
    context?: Record<string, any>;
}

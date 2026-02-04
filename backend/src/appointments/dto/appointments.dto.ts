/**
 * Appointment DTOs with class-validator validation
 * Used by: appointments.controller.ts
 */
import {
    IsString,
    IsOptional,
    IsEnum,
    IsBoolean,
    IsEmail,
    IsDateString,
    Matches,
    IsNotEmpty,
    MaxLength,
    MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enums (matching Prisma schema)
export enum AppointmentType {
    LAB_VISIT = 'LAB_VISIT',
    HOME_SAMPLING = 'HOME_SAMPLING',
}

export enum AppointmentStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

// Book Appointment (Public endpoint)
export class BookAppointmentDto {
    @ApiProperty({ description: 'Tenant ID' })
    @IsString()
    @IsNotEmpty()
    tenantId: string;

    @ApiProperty({ description: 'Patient name', example: 'Jean Dupont' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiProperty({ description: 'Patient phone number', example: '+237699123456' })
    @IsString()
    @Matches(/^\+?[1-9]\d{1,14}$/, {
        message: 'Phone must be a valid E.164 format (e.g., +237699123456)',
    })
    phone: string;

    @ApiPropertyOptional({ description: 'Patient email' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiProperty({ enum: AppointmentType, description: 'Type of appointment' })
    @IsEnum(AppointmentType)
    type: AppointmentType;

    @ApiProperty({ description: 'Appointment date and time (ISO 8601)' })
    @IsDateString()
    date: string;

    @ApiPropertyOptional({ description: 'Address for home sampling' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    address?: string;

    @ApiPropertyOptional({ description: 'Additional notes' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}

// Update Appointment Status
export class UpdateAppointmentStatusDto {
    @ApiProperty({ enum: AppointmentStatus, description: 'New appointment status' })
    @IsEnum(AppointmentStatus)
    status: AppointmentStatus;
}

// Create Blocked Slot
export class CreateBlockedSlotDto {
    @ApiProperty({ description: 'Date to block (YYYY-MM-DD)' })
    @IsDateString()
    date: string;

    @ApiPropertyOptional({ description: 'Block entire day', default: true })
    @IsOptional()
    @IsBoolean()
    allDay?: boolean;

    @ApiPropertyOptional({ description: 'Start time if not all day (HH:MM)' })
    @IsOptional()
    @IsString()
    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: 'startTime must be in HH:MM format',
    })
    startTime?: string;

    @ApiPropertyOptional({ description: 'End time if not all day (HH:MM)' })
    @IsOptional()
    @IsString()
    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: 'endTime must be in HH:MM format',
    })
    endTime?: string;

    @ApiPropertyOptional({ description: 'Reason for blocking', example: 'Jour férié' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    reason?: string;
}

// Query Appointments
export class GetAppointmentsQueryDto {
    @ApiPropertyOptional({ description: 'Start date filter (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'End date filter (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ enum: AppointmentStatus, description: 'Status filter' })
    @IsOptional()
    @IsEnum(AppointmentStatus)
    status?: AppointmentStatus;
}

// Reschedule Appointment
export class RescheduleAppointmentDto {
    @ApiProperty({ description: 'New appointment date and time (ISO 8601)' })
    @IsDateString()
    newDate: string;

    @ApiPropertyOptional({ description: 'Reason for rescheduling' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    reason?: string;
}

// Cancel Appointment with reason
export class CancelAppointmentDto {
    @ApiPropertyOptional({ description: 'Cancellation reason' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    reason?: string;

    @ApiPropertyOptional({ description: 'Whether to notify patient', default: true })
    @IsOptional()
    @IsBoolean()
    notifyPatient?: boolean;
}

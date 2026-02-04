import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsUUID, IsArray, IsBoolean, IsNumber, Min, Max, IsIn, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new tenant (laboratory)
 */
export class CreateTenantDto {
    @ApiProperty({ example: 'Laboratoire Central' })
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    name: string;

    @ApiProperty({ example: 'admin@lab.cm' })
    @IsEmail()
    adminEmail: string;

    @ApiPropertyOptional({ example: 'STARTER' })
    @IsOptional()
    @IsString()
    @IsIn(['STARTER', 'PREMIUM', 'ENTERPRISE'])
    planId?: string;
}

/**
 * DTO for updating tenant settings
 */
export class UpdateTenantDto {
    @ApiPropertyOptional({ example: 'New Lab Name' })
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @ApiPropertyOptional({ example: 30, description: 'Document retention in days' })
    @IsOptional()
    @IsNumber()
    @Min(7)
    @Max(365)
    retentionDays?: number;

    @ApiPropertyOptional({ example: '#3b82f6' })
    @IsOptional()
    @IsString()
    @Matches(/^#([0-9A-Fa-f]{6})$/, { message: 'brandColor must be a valid hex color (e.g., #3b82f6)' })
    brandColor?: string;

    @ApiPropertyOptional({ example: 'mon-labo' })
    @IsOptional()
    @IsString()
    @Matches(/^[a-z0-9-]+$/, { message: 'slug must contain only lowercase letters, numbers, and hyphens' })
    slug?: string;
}

/**
 * DTO for activating a license
 */
export class ActivateLicenseDto {
    @ApiProperty({ example: 'XXXX-XXXX-XXXX-XXXX' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^[A-Z0-9-]+$/, { message: 'License code format is invalid' })
    code: string;
}

/**
 * DTO for configuring SMS settings
 */
export class ConfigureSmsDto {
    @ApiProperty({ example: 'campay' })
    @IsNotEmpty()
    @IsString()
    @IsIn(['campay', 'msg91', 'twilio'])
    provider: string;

    @ApiPropertyOptional({ example: 'api_key_here' })
    @IsOptional()
    @IsString()
    apiKey?: string;

    @ApiPropertyOptional({ example: 'api_secret_here' })
    @IsOptional()
    @IsString()
    apiSecret?: string;
}

/**
 * DTO for CamPay credentials
 */
export class CamPayCredentialsDto {
    @ApiProperty({ example: 'campay_username' })
    @IsNotEmpty()
    @IsString()
    campayUsername: string;

    @ApiProperty({ example: 'campay_password' })
    @IsNotEmpty()
    @IsString()
    campayPassword: string;
}

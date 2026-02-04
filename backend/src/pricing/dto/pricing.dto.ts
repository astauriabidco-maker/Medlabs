import { IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max, IsIn, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a pricing plan
 */
export class CreatePlanDto {
    @ApiProperty({ example: 'PREMIUM' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ example: 49000, description: 'Price in XAF' })
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    price: number;

    @ApiPropertyOptional({ example: 'monthly' })
    @IsOptional()
    @IsString()
    @IsIn(['monthly', 'yearly', 'one-time'])
    billingCycle?: string;

    @ApiPropertyOptional({ example: ['feature1', 'feature2'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    features?: string[];

    @ApiPropertyOptional({ example: 100 })
    @IsOptional()
    @IsNumber()
    @Min(-1)
    documentsLimit?: number;

    @ApiPropertyOptional({ example: 5 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    usersLimit?: number;
}

/**
 * DTO for updating a pricing plan
 */
export class UpdatePlanDto {
    @ApiPropertyOptional({ example: 'NEW_PREMIUM' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 59000 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ example: ['feature1', 'feature2', 'feature3'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    features?: string[];
}

/**
 * DTO for creating a feature
 */
export class CreateFeatureDto {
    @ApiProperty({ example: 'WhatsApp Integration' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: 'Send results via WhatsApp' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: 'WHATSAPP_INTEGRATION' })
    @IsOptional()
    @IsString()
    code?: string;
}

/**
 * DTO for updating a feature
 */
export class UpdateFeatureDto {
    @ApiPropertyOptional({ example: 'Updated WhatsApp Integration' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 'Updated description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

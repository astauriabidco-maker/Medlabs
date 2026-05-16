import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  MinLength,
  MaxLength,
  ArrayMaxSize,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a custom role
 */
export class CreateRoleDto {
  @ApiProperty({ example: 'Senior Technician' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: 'Technician with additional permissions' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({ example: ['UPLOAD_SCAN', 'VIEW_RESULTS', 'HANDLE_ALERTS'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  permissions: string[];
}

/**
 * DTO for updating a custom role
 */
export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Updated Role Name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ example: ['UPLOAD_SCAN', 'VIEW_RESULTS'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  permissions?: string[];
}

/**
 * DTO for inviting a team member
 */
export class InviteTeamMemberDto {
  @ApiProperty({ example: 'nouveau.membre@lab.cm' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ example: 'Jean' })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Dupont' })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'uuid-of-custom-role' })
  @IsNotEmpty()
  @IsString()
  customRoleId: string;
}

/**
 * DTO for updating a team member
 */
export class UpdateTeamMemberDto {
  @ApiPropertyOptional({ example: 'Jean-Pierre' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Dupont-Martin' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ example: 'new-custom-role-uuid' })
  @IsOptional()
  @IsString()
  customRoleId?: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}

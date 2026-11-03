import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsEmail, IsEnum, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength,
} from 'class-validator';
import { ContactPreference } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const PHONE = /^[+0-9 ().-]{6,20}$/;

export class UpdateMeDto {
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(100)
  firstName?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(100)
  lastName?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @Matches(PHONE, { message: 'Numéro de téléphone invalide.' })
  phone?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(120)
  jobTitle?: string;
  @ApiPropertyOptional({ enum: ContactPreference }) @IsOptional() @IsEnum(ContactPreference)
  contactPreference?: ContactPreference;
}

export class CreateStaffUserDto {
  @ApiProperty() @Transform(lower) @IsEmail() @MaxLength(254)
  email: string;
  @ApiProperty() @Transform(trim) @IsString() @MinLength(1) @MaxLength(100)
  firstName: string;
  @ApiProperty() @Transform(trim) @IsString() @MinLength(1) @MaxLength(100)
  lastName: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(120)
  jobTitle?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @Matches(PHONE, { message: 'Numéro de téléphone invalide.' })
  phone?: string;
  @ApiProperty({ example: ['MEMBERSHIP_MANAGER'], description: 'Rôles du personnel CAPH-CI (portée GLOBAL)' })
  @IsArray() @ArrayMinSize(1) @IsString({ each: true })
  roleCodes: string[];
  @ApiPropertyOptional({ description: 'Obligatoire pour DELEGATION_MANAGER : limite le rôle à cette délégation' })
  @IsOptional() @IsUUID()
  delegationId?: string;
}

export class SetUserStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'DISABLED'] }) @IsIn(['ACTIVE', 'DISABLED'])
  status: 'ACTIVE' | 'DISABLED';
}

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['INVITED', 'ACTIVE', 'DISABLED'] })
  @IsOptional() @IsIn(['INVITED', 'ACTIVE', 'DISABLED'])
  status?: 'INVITED' | 'ACTIVE' | 'DISABLED';
}

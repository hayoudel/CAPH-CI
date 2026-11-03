import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { asBool, trimmed } from '../../common/utils/files';

export class ListCommunicationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['INTERNAL', 'EXTERNAL'] }) @IsOptional() @IsIn(['INTERNAL', 'EXTERNAL']) kind?: 'INTERNAL' | 'EXTERNAL';
  @ApiPropertyOptional({ description: 'Seulement les communications non lues' }) @IsOptional() @Transform(asBool) @IsBoolean() unread?: boolean;
  @ApiPropertyOptional({ description: 'Gestionnaires : inclure les communications archivées' }) @IsOptional() @Transform(asBool) @IsBoolean() includeArchived?: boolean;
}

export class CreateCommunicationDto {
  @ApiPropertyOptional({ enum: ['INTERNAL', 'EXTERNAL'], default: 'INTERNAL', description: 'EXTERNAL + audienceAll = visible sur le site public' })
  @IsOptional() @IsIn(['INTERNAL', 'EXTERNAL']) kind?: 'INTERNAL' | 'EXTERNAL';
  @ApiPropertyOptional({ example: 'Information' }) @IsOptional() @Transform(trimmed) @IsString() @MaxLength(60) category?: string;
  @ApiProperty() @Transform(trimmed) @IsString() @MinLength(3) @MaxLength(200) title: string;
  @ApiProperty() @Transform(trimmed) @IsString() @MinLength(10) @MaxLength(10000) body: string;
  @ApiPropertyOptional({ default: 'Équipe CAPH-CI' }) @IsOptional() @Transform(trimmed) @IsString() @MaxLength(100) senderLabel?: string;
  @ApiPropertyOptional({ default: true, description: 'true = toutes les organisations ; false = seulement les cibles ci-dessous' })
  @IsOptional() @IsBoolean() audienceAll?: boolean;
  @ApiPropertyOptional({ type: [String], description: 'Délégations visées (si audienceAll = false)' })
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ArrayUnique() @IsUUID('all', { each: true }) delegationIds?: string[];
  @ApiPropertyOptional({ type: [String], description: 'Organisations visées (si audienceAll = false)' })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @ArrayUnique() @IsUUID('all', { each: true }) organizationIds?: string[];
}

export class UpdateCommunicationDto {
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MaxLength(60) category?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MinLength(3) @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MinLength(10) @MaxLength(10000) body?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() audienceAll?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(50) @ArrayUnique() @IsUUID('all', { each: true }) delegationIds?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(500) @ArrayUnique() @IsUUID('all', { each: true }) organizationIds?: string[];
}

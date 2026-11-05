import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { asBool, trimmed } from '../../common/utils/files';
import { REVIEW_STATUSES } from '../../common/utils/review';

export const EVENT_TYPES = ['MEETING', 'TRAINING', 'GENERAL_ASSEMBLY', 'CONFERENCE', 'FORUM', 'CAMPAIGN', 'CEREMONY'] as const;
export const EVENT_MODES = ['ONLINE', 'ONSITE', 'HYBRID'] as const;
export const EVENT_STATUSES = ['PLANNED', 'OPEN', 'REGISTRATION', 'CLOSED', 'CANCELLED'] as const;
type T = (typeof EVENT_TYPES)[number];
type M = (typeof EVENT_MODES)[number];
type S = (typeof EVENT_STATUSES)[number];

export class ListEventsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: REVIEW_STATUSES, description: 'Validation par le personnel : PENDING = en attente, APPROVED = validé, REJECTED = refusé' })
  @IsOptional() @IsIn(REVIEW_STATUSES as unknown as string[])
  review?: (typeof REVIEW_STATUSES)[number];

  @ApiPropertyOptional({ enum: EVENT_TYPES }) @IsOptional() @IsIn(EVENT_TYPES as unknown as string[]) type?: T;
  @ApiPropertyOptional({ enum: EVENT_STATUSES }) @IsOptional() @IsIn(EVENT_STATUSES as unknown as string[]) status?: S;
  @ApiPropertyOptional() @IsOptional() @IsUUID() regionId?: string;
  @ApiPropertyOptional({ description: 'À partir du (AAAA-MM-JJ). Par défaut : aujourd’hui.' }) @IsOptional() @Type(() => Date) @IsDate() from?: Date;
  @ApiPropertyOptional({ description: 'Jusqu’au (AAAA-MM-JJ)' }) @IsOptional() @Type(() => Date) @IsDate() to?: Date;
  @ApiPropertyOptional({ description: 'true = événements passés (du plus récent au plus ancien)' }) @IsOptional() @Transform(asBool) @IsBoolean() past?: boolean;
  @ApiPropertyOptional({ description: 'Gestionnaires : inclure les événements archivés' }) @IsOptional() @Transform(asBool) @IsBoolean() includeArchived?: boolean;
}

export class CreateEventDto {
  @ApiProperty({ enum: EVENT_TYPES }) @IsIn(EVENT_TYPES as unknown as string[]) type: T;
  @ApiProperty() @Transform(trimmed) @IsString() @MinLength(3) @MaxLength(200) title: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MaxLength(5000) description?: string;
  @ApiProperty({ example: '2026-12-10T09:00:00Z' }) @Type(() => Date) @IsDate() startsAt: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() endsAt?: Date;
  @ApiPropertyOptional({ enum: EVENT_MODES, default: 'ONSITE' }) @IsOptional() @IsIn(EVENT_MODES as unknown as string[]) mode?: M;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MaxLength(255) location?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() regionId?: string;
  @ApiPropertyOptional({ enum: EVENT_STATUSES, default: 'PLANNED' }) @IsOptional() @IsIn(EVENT_STATUSES as unknown as string[]) status?: S;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ enum: EVENT_TYPES }) @IsOptional() @IsIn(EVENT_TYPES as unknown as string[]) type?: T;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MinLength(3) @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MaxLength(5000) description?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() startsAt?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() endsAt?: Date;
  @ApiPropertyOptional({ enum: EVENT_MODES }) @IsOptional() @IsIn(EVENT_MODES as unknown as string[]) mode?: M;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MaxLength(255) location?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() regionId?: string;
  @ApiPropertyOptional({ enum: EVENT_STATUSES }) @IsOptional() @IsIn(EVENT_STATUSES as unknown as string[]) status?: S;
}

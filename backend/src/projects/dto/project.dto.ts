import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { asBool, trimmed } from '../../common/utils/files';

export const PROJECT_STATUSES = ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'TO_COMPLETE', 'VALIDATED', 'REJECTED', 'ONGOING', 'COMPLETED'] as const;
export type ProjectStatusName = (typeof PROJECT_STATUSES)[number];
export const PROJECT_FILTERS = ['ALL', 'ONGOING', 'COMPLETED', 'PENDING', 'MINE'] as const;

export class ListProjectsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PROJECT_FILTERS, description: 'Tous / en cours / terminés / en attente de validation (mes projets) / mes projets' })
  @IsOptional() @IsIn(PROJECT_FILTERS as unknown as string[]) filter?: (typeof PROJECT_FILTERS)[number];
  @ApiPropertyOptional({ enum: PROJECT_STATUSES, description: 'Personnel : filtrer sur un statut' }) @IsOptional() @IsIn(PROJECT_STATUSES as unknown as string[]) status?: ProjectStatusName;
  @ApiPropertyOptional({ description: 'Personnel : filtrer sur une organisation' }) @IsOptional() @IsUUID() organizationId?: string;
}

const text = (max: number) => [IsOptional(), Transform(trimmed), IsString(), MaxLength(max)];
const apply = (...d: PropertyDecorator[]) => (t: object, k: string) => d.forEach((x) => x(t, k));

class ProjectFields {
  @ApiPropertyOptional({ description: 'Contexte et justification' }) @apply(...text(3000)) context?: string;
  @ApiPropertyOptional() @apply(...text(3000)) objectives?: string;
  @ApiPropertyOptional({ description: 'Description détaillée (20 caractères minimum à la soumission)' }) @apply(...text(6000)) description?: string;
  @ApiPropertyOptional() @apply(...text(1500)) beneficiaries?: string;
  @ApiPropertyOptional({ description: 'Zone d’intervention' }) @apply(...text(300)) zone?: string;
  @ApiPropertyOptional({ description: 'AAAA-MM-JJ' }) @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional({ description: 'Fin prévisionnelle, AAAA-MM-JJ' }) @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional({ description: 'Budget estimatif en F CFA' }) @IsOptional() @IsInt() @Min(0) @Max(100_000_000_000) budgetXof?: number;
  @ApiPropertyOptional() @apply(...text(1500)) partners?: string;
  @ApiPropertyOptional() @apply(...text(3000)) expectedResults?: string;
}

export class CreateProjectDto extends ProjectFields {
  @ApiProperty() @Transform(trimmed) @IsString() @MinLength(5) @MaxLength(200) title: string;
  @ApiPropertyOptional({ default: true, description: 'true : soumettre à la validation ; false : brouillon' }) @IsOptional() @Transform(asBool) @IsBoolean() submit?: boolean;
}

export class UpdateProjectDto extends ProjectFields {
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MinLength(5) @MaxLength(200) title?: string;
}

export const REVIEW_STATUSES = ['IN_REVIEW', 'TO_COMPLETE', 'VALIDATED', 'REJECTED', 'ONGOING', 'COMPLETED'] as const;
export class ReviewProjectDto {
  @ApiProperty({ enum: REVIEW_STATUSES, description: 'SUBMITTED → IN_REVIEW / TO_COMPLETE / VALIDATED / REJECTED ; IN_REVIEW → TO_COMPLETE / VALIDATED / REJECTED ; VALIDATED → ONGOING ; ONGOING → COMPLETED' })
  @IsIn(REVIEW_STATUSES as unknown as string[]) status: (typeof REVIEW_STATUSES)[number];
  @ApiPropertyOptional({ description: 'Obligatoire pour « à compléter » et « refusé » ; visible par l’organisation' }) @IsOptional() @Transform(trimmed) @IsString() @MaxLength(1500) note?: string;
  @ApiPropertyOptional({ description: 'Avancement 0-100, uniquement à partir de « validé »' }) @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @ApiPropertyOptional({ description: 'Résultats ou réalisations constatés' }) @IsOptional() @Transform(trimmed) @IsString() @MaxLength(3000) results?: string;
}

export class ProgressDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MaxLength(3000) results?: string;
}

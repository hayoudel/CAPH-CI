import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { asBool, trimmed } from '../../common/utils/files';

export const NEWS_STATUSES = ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'CORRECTION', 'APPROVED', 'REJECTED', 'PUBLISHED'] as const;
export const NEWS_SUMMARY_MAX = 300;
export const NEWS_CONTENT_MAX = 5000;

export class ListNewsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: NEWS_STATUSES }) @IsOptional() @IsIn(NEWS_STATUSES as unknown as string[]) status?: (typeof NEWS_STATUSES)[number];
  @ApiPropertyOptional({ description: 'Personnel : filtrer sur une organisation' }) @IsOptional() @IsUUID() organizationId?: string;
}

/** Champs communs : tous facultatifs sauf le titre à la création. La complétude est vérifiée à la soumission. */
class NewsFields {
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional({ description: 'Résumé court (300 caractères maximum)' }) @IsOptional() @Transform(trimmed) @IsString() @MaxLength(NEWS_SUMMARY_MAX) summary?: string;
  @ApiPropertyOptional({ description: 'Contenu complet (20 caractères minimum à la soumission)' }) @IsOptional() @Transform(trimmed) @IsString() @MaxLength(NEWS_CONTENT_MAX) description?: string;
  @ApiPropertyOptional({ description: 'Date de l’événement ou de l’actualité (AAAA-MM-JJ)' }) @IsOptional() @IsDateString() newsDate?: string;
}

export class CreateNewsDto extends NewsFields {
  @ApiProperty() @Transform(trimmed) @IsString() @MinLength(5) @MaxLength(200) title: string;
  @ApiPropertyOptional({ default: true, description: 'true : soumettre à la validation ; false : enregistrer comme brouillon' })
  @IsOptional() @Transform(asBool) @IsBoolean() submit?: boolean;
}

export class UpdateNewsDto extends NewsFields {
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MinLength(5) @MaxLength(200) title?: string;
}

export class ReviewNewsDto {
  @ApiProperty({ enum: ['IN_REVIEW', 'CORRECTION', 'APPROVED', 'REJECTED', 'PUBLISHED'], description: 'SUBMITTED → IN_REVIEW / CORRECTION / APPROVED / REJECTED ; IN_REVIEW → CORRECTION / APPROVED / REJECTED ; APPROVED → PUBLISHED' })
  @IsIn(['IN_REVIEW', 'CORRECTION', 'APPROVED', 'REJECTED', 'PUBLISHED']) status: 'IN_REVIEW' | 'CORRECTION' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  @ApiPropertyOptional({ description: 'Obligatoire pour une correction ou un refus ; visible par l’organisation' })
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(1500) note?: string;
}

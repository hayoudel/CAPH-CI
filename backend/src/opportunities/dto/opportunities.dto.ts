import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { asBool, trimmed } from '../../common/utils/files';
import { REVIEW_STATUSES } from '../../common/utils/review';

export const OPP_TYPES = ['CALL_FOR_PROJECTS', 'TRAINING', 'CONSULTATION', 'JOB', 'INTERNSHIP', 'GRANT', 'OTHER'] as const;
export const OPP_STATUSES = ['OPEN', 'CLOSED', 'ENDED'] as const;
type OppType = (typeof OPP_TYPES)[number];

export class ListOpportunitiesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: REVIEW_STATUSES, description: 'Validation par le personnel : PENDING = en attente, APPROVED = validé, REJECTED = refusé' })
  @IsOptional() @IsIn(REVIEW_STATUSES as unknown as string[])
  review?: (typeof REVIEW_STATUSES)[number];

  @ApiPropertyOptional({ enum: OPP_TYPES }) @IsOptional() @IsIn(OPP_TYPES as unknown as string[]) type?: OppType;
  @ApiPropertyOptional({ enum: OPP_STATUSES, description: 'ENDED = clôturée OU date limite dépassée' })
  @IsOptional() @IsIn(OPP_STATUSES as unknown as string[]) status?: (typeof OPP_STATUSES)[number];
  @ApiPropertyOptional({ description: 'Gestionnaires : inclure les opportunités archivées' })
  @IsOptional() @Transform(asBool) @IsBoolean() includeArchived?: boolean;
}

export class CreateOpportunityDto {
  @ApiProperty({ enum: OPP_TYPES }) @IsIn(OPP_TYPES as unknown as string[]) type: OppType;
  @ApiProperty() @Transform(trimmed) @IsString() @MinLength(5) @MaxLength(200) title: string;
  @ApiProperty({ description: 'Résumé affiché dans la liste' }) @Transform(trimmed) @IsString() @MinLength(10) @MaxLength(500) summary: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MaxLength(10000) body?: string;
  @ApiPropertyOptional({ example: '2026-12-31' }) @IsOptional() @Type(() => Date) @IsDate() deadline?: Date;
  @ApiPropertyOptional({ description: 'Public concerné' }) @IsOptional() @Transform(trimmed) @IsString() @MaxLength(300) audience?: string;
  @ApiPropertyOptional({ description: 'Modalités (ex. dépôt en ligne)' }) @IsOptional() @Transform(trimmed) @IsString() @MaxLength(500) modality?: string;
  @ApiPropertyOptional({ enum: ['PUBLIC', 'MEMBERS'], default: 'MEMBERS', description: 'PUBLIC = visible sur le site public' })
  @IsOptional() @IsIn(['PUBLIC', 'MEMBERS']) visibility?: 'PUBLIC' | 'MEMBERS';
}

export class UpdateOpportunityDto {
  @ApiPropertyOptional({ enum: OPP_TYPES }) @IsOptional() @IsIn(OPP_TYPES as unknown as string[]) type?: OppType;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MinLength(5) @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MinLength(10) @MaxLength(500) summary?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MaxLength(10000) body?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() deadline?: Date;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MaxLength(300) audience?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MaxLength(500) modality?: string;
  @ApiPropertyOptional({ enum: ['PUBLIC', 'MEMBERS'] }) @IsOptional() @IsIn(['PUBLIC', 'MEMBERS']) visibility?: 'PUBLIC' | 'MEMBERS';
}

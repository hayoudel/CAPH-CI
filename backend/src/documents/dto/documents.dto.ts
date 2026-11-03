import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { asBool, trimmed } from '../../common/utils/files';

export const DOC_CATEGORIES = ['GUIDE', 'FORM', 'MEETING_MINUTES', 'REFERENCE', 'OTHER'] as const;
export const ACCESS_LEVELS = ['MEMBERS', 'CONTRIBUTORS'] as const;

export class ListDocumentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DOC_CATEGORIES }) @IsOptional() @IsIn(DOC_CATEGORIES as unknown as string[])
  category?: (typeof DOC_CATEGORIES)[number];

  @ApiPropertyOptional({ description: 'Personnel gestionnaire : inclure les documents archivés' })
  @IsOptional() @Transform(asBool) @IsBoolean()
  includeArchived?: boolean;
}

export class CreateDocumentDto {
  @ApiProperty() @Transform(trimmed) @IsString() @MinLength(3) @MaxLength(200)
  title: string;

  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: DOC_CATEGORIES }) @IsIn(DOC_CATEGORIES as unknown as string[])
  category: (typeof DOC_CATEGORIES)[number];

  @ApiPropertyOptional({ enum: ACCESS_LEVELS, default: 'MEMBERS', description: 'CONTRIBUTORS = Président et Contributeurs seulement' })
  @IsOptional() @IsIn(ACCESS_LEVELS as unknown as string[])
  accessLevel?: (typeof ACCESS_LEVELS)[number];

  @ApiPropertyOptional({ default: false, description: 'Mis en avant sur le tableau de bord' })
  @IsOptional() @Transform(asBool) @IsBoolean()
  isFeatured?: boolean;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MinLength(3) @MaxLength(200)
  title?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MaxLength(1000)
  description?: string;
  @ApiPropertyOptional({ enum: DOC_CATEGORIES }) @IsOptional() @IsIn(DOC_CATEGORIES as unknown as string[])
  category?: (typeof DOC_CATEGORIES)[number];
  @ApiPropertyOptional({ enum: ACCESS_LEVELS }) @IsOptional() @IsIn(ACCESS_LEVELS as unknown as string[])
  accessLevel?: (typeof ACCESS_LEVELS)[number];
  @ApiPropertyOptional() @IsOptional() @Transform(asBool) @IsBoolean()
  isFeatured?: boolean;
}

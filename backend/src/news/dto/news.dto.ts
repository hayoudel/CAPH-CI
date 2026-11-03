import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { trimmed } from '../../common/utils/files';

export const NEWS_STATUSES = ['SUBMITTED', 'CORRECTION', 'APPROVED', 'REJECTED', 'PUBLISHED'] as const;

export class ListNewsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: NEWS_STATUSES }) @IsOptional() @IsIn(NEWS_STATUSES as unknown as string[]) status?: (typeof NEWS_STATUSES)[number];
  @ApiPropertyOptional({ description: 'Personnel : filtrer sur une organisation' }) @IsOptional() @IsUUID() organizationId?: string;
}

export class CreateNewsDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiProperty() @Transform(trimmed) @IsString() @MinLength(5) @MaxLength(200) title: string;
  @ApiProperty() @Transform(trimmed) @IsString() @MinLength(20) @MaxLength(5000) description: string;
}

export class UpdateNewsDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MinLength(5) @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MinLength(20) @MaxLength(5000) description?: string;
}

export class ReviewNewsDto {
  @ApiProperty({ enum: ['CORRECTION', 'APPROVED', 'REJECTED', 'PUBLISHED'], description: 'SUBMITTED → CORRECTION / APPROVED / REJECTED ; APPROVED → PUBLISHED' })
  @IsIn(['CORRECTION', 'APPROVED', 'REJECTED', 'PUBLISHED']) status: 'CORRECTION' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  @ApiPropertyOptional({ description: 'Obligatoire pour une correction ou un refus ; visible par l’organisation' })
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(1500) note?: string;
}

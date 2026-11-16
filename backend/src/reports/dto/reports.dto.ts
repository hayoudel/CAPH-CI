import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { Equals, IsDate, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { trimmed } from '../../common/utils/files';

export const REPORT_TYPES = ['ACTIVITY', 'FINANCIAL', 'OTHER'] as const;
export const REPORT_STATUSES = ['RECEIVED', 'IN_PROCESS', 'PROCESSED', 'CORRECTION_REQUESTED'] as const;

export class ListReportsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: REPORT_STATUSES }) @IsOptional() @IsIn(REPORT_STATUSES as unknown as string[]) status?: (typeof REPORT_STATUSES)[number];
  @ApiPropertyOptional({ enum: REPORT_TYPES }) @IsOptional() @IsIn(REPORT_TYPES as unknown as string[]) type?: (typeof REPORT_TYPES)[number];
  @ApiPropertyOptional({ description: 'Personnel : filtrer sur une organisation' }) @IsOptional() @IsUUID() organizationId?: string;
}

export class CreateReportDto {
  @ApiProperty({ enum: REPORT_TYPES }) @IsIn(REPORT_TYPES as unknown as string[]) type: (typeof REPORT_TYPES)[number];
  @ApiProperty() @Transform(trimmed) @IsString() @MinLength(3) @MaxLength(200) title: string;
  @ApiProperty({ description: '600 caractères maximum' }) @Transform(trimmed) @IsString() @MinLength(10) @MaxLength(600) summary: string;
  @ApiPropertyOptional({ example: '2026-01-01' }) @IsOptional() @Type(() => Date) @IsDate() periodStart?: Date;
  @ApiPropertyOptional({ example: '2026-06-30' }) @IsOptional() @Type(() => Date) @IsDate() periodEnd?: Date;
  @ApiProperty({ description: 'Je certifie être habilité(e) à transmettre ce rapport au nom de l’organisation' })
  @Equals(true, { message: 'Vous devez certifier être habilité(e) à transmettre ce rapport.' }) certifyAuthority: boolean;
}

export class UpdateReportDto {
  @ApiPropertyOptional({ enum: REPORT_TYPES }) @IsOptional() @IsIn(REPORT_TYPES as unknown as string[]) type?: (typeof REPORT_TYPES)[number];
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MinLength(3) @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trimmed) @IsString() @MinLength(10) @MaxLength(600) summary?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() periodStart?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() periodEnd?: Date;
}

export class ReviewReportDto {
  @ApiProperty({ enum: ['IN_PROCESS', 'PROCESSED', 'CORRECTION_REQUESTED'] }) @IsIn(['IN_PROCESS', 'PROCESSED', 'CORRECTION_REQUESTED'])
  status: 'IN_PROCESS' | 'PROCESSED' | 'CORRECTION_REQUESTED';
  @ApiPropertyOptional({ description: 'Obligatoire si une correction est demandée ; visible par l’organisation' })
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(1500) note?: string;
}

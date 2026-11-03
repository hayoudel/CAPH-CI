import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Recherche texte' })
  @IsOptional() @IsString() @MaxLength(100)
  q?: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const paginated = <T>(data: T[], total: number, p: { page: number; limit: number }): Paginated<T> => ({
  data,
  meta: { page: p.page, limit: p.limit, total, totalPages: Math.max(1, Math.ceil(total / p.limit)) },
});

/** Calcule skip/take Prisma à partir de la pagination. */
export const pageArgs = (p: { page: number; limit: number }) => ({
  skip: (p.page - 1) * p.limit, take: p.limit,
});

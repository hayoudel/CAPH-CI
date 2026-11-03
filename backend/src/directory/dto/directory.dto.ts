import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class DirectoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrer par région' }) @IsOptional() @IsUUID() regionId?: string;
  @ApiPropertyOptional({ description: "Filtrer par domaine d'intervention" }) @IsOptional() @IsUUID() domainId?: string;
  @ApiPropertyOptional({ description: 'Filtrer par type de handicap' }) @IsOptional() @IsUUID() disabilityTypeId?: string;
}

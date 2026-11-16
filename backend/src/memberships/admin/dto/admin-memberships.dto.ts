import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate, IsEmail, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ArrayMinSize, ArrayUnique, IsArray,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

const clean = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value);
const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export const STATUS_VALUES = ['SUBMITTED', 'TO_COMPLETE', 'UNDER_REVIEW', 'ADMITTED_PAYMENT_PENDING', 'ADJOURNED', 'REJECTED', 'REGISTERED', 'WITHDRAWN'] as const;

export class ListMembershipsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: STATUS_VALUES }) @IsOptional() @IsIn(STATUS_VALUES as unknown as string[])
  status?: (typeof STATUS_VALUES)[number];

  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() delegationId?: string;

  @ApiPropertyOptional({ description: 'Déposés à partir du (AAAA-MM-JJ)' }) @IsOptional() @Type(() => Date) @IsDate() from?: Date;
  @ApiPropertyOptional({ description: 'Déposés jusqu’au (AAAA-MM-JJ)' }) @IsOptional() @Type(() => Date) @IsDate() to?: Date;

  @ApiPropertyOptional({ enum: ['recent', 'oldest'], default: 'recent' }) @IsOptional() @IsIn(['recent', 'oldest'])
  sort: 'recent' | 'oldest' = 'recent';
}

export class ReviewDocumentDto {
  @ApiProperty({ enum: ['ACCEPTED', 'REJECTED'] }) @IsIn(['ACCEPTED', 'REJECTED'])
  status: 'ACCEPTED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Obligatoire si la pièce est refusée ; visible par le demandeur' })
  @IsOptional() @Transform(clean) @IsString() @MaxLength(500)
  note?: string;
}

export class RequestInfoDto {
  @ApiProperty({ description: 'Message au demandeur : que doit-il compléter ou corriger ? (visible par lui)' })
  @Transform(clean) @IsString() @MinLength(10, { message: 'Précisez ce qui doit être complété (10 caractères minimum).' }) @MaxLength(1500)
  message: string;
}

export class AssignDelegationDto {
  @ApiProperty() @IsUUID() delegationId: string;

  @ApiPropertyOptional({ description: 'Motif si la délégation diffère de celle demandée par le demandeur' })
  @IsOptional() @Transform(clean) @IsString() @MaxLength(300)
  reason?: string;
}

export class DecisionDto {
  @ApiProperty({ enum: ['ADMITTED', 'ADJOURNED', 'REJECTED'] }) @IsIn(['ADMITTED', 'ADJOURNED', 'REJECTED'])
  outcome: 'ADMITTED' | 'ADJOURNED' | 'REJECTED';

  @ApiProperty({ enum: ['BOARD', 'GENERAL_ASSEMBLY'], description: 'Instance qui a décidé (CA ou AG)' }) @IsIn(['BOARD', 'GENERAL_ASSEMBLY'])
  body: 'BOARD' | 'GENERAL_ASSEMBLY';

  @ApiProperty({ example: 'CA-2026-014', description: 'Référence de la décision / du procès-verbal' })
  @Transform(clean) @IsString() @MinLength(3) @MaxLength(100)
  decisionReference: string;

  @ApiProperty({ example: '2026-11-03', description: 'Date de la décision' }) @Type(() => Date) @IsDate()
  decidedAt: Date;

  @ApiPropertyOptional({ description: 'Obligatoire si ajourné ou refusé ; visible par le demandeur' })
  @IsOptional() @Transform(clean) @IsString() @MaxLength(1500)
  motive?: string;
}

export class RecordPaymentDto {
  @ApiProperty({ enum: ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER'] }) @IsIn(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER'])
  method: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'OTHER';

  @ApiProperty({ example: 'REC-2026-0042', description: 'N° du reçu (unique)' })
  @Transform(clean) @IsString() @MinLength(2) @MaxLength(60)
  receiptNumber: string;

  @ApiPropertyOptional({ description: 'Date du paiement (par défaut : aujourd’hui)' }) @IsOptional() @Type(() => Date) @IsDate()
  paidAt?: Date;

  @ApiPropertyOptional({ type: [String], description: 'Codes du barème encaissés (par défaut : tout le barème de la catégorie). Les montants viennent TOUJOURS du barème en base.' })
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayUnique() @Matches(/^[A-Z_]{3,40}$/, { each: true })
  feeCodes?: string[];
}

export class RegisterDto {
  @ApiPropertyOptional({ description: 'Délégation de rattachement (par défaut : celle du dossier, sinon celle de la région)' })
  @IsOptional() @IsUUID() delegationId?: string;

  @ApiPropertyOptional({ description: 'E-mail du compte Président si différent de celui du représentant déclaré' })
  @IsOptional() @Transform(lower) @IsEmail() @MaxLength(254)
  presidentEmail?: string;

  @ApiPropertyOptional({ description: 'N° de carte de membre, si déjà attribué' })
  @IsOptional() @Transform(clean) @IsString() @MaxLength(50)
  memberCardNumber?: string;
}

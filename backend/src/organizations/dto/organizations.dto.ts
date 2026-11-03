import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUrl, IsUUID, Matches, MaxLength, MinLength, ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

/** '' → null (permet d'effacer un champ), sinon texte nettoyé. */
export const MEMBER_ROLES = ['OPH_DEPUTY', 'OPH_CONTRIBUTOR', 'OPH_VIEWER'] as const;
export type MemberRoleCode = (typeof MEMBER_ROLES)[number];

const clean = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const PHONE = /^[+0-9 ().-]{6,20}$/;
const URL_OPTS = { protocols: ['http', 'https'], require_protocol: true };

/** Champs que le Président peut modifier. Le nom, la référence légale, le n° de membre,
 *  le statut et la délégation ne sont PAS modifiables ici (validation CAPH-CI requise). */
export class UpdateOrganizationDto {
  @ApiPropertyOptional() @IsOptional() @Transform(clean) @IsString() @MaxLength(30)
  acronym?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(clean) @IsString() @MaxLength(255)
  address?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(clean) @IsString() @MaxLength(255)
  postalAddress?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(clean) @IsString() @MaxLength(100)
  commune?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(clean) @IsUUID()
  regionId?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(clean) @Matches(PHONE, { message: 'Numéro de téléphone invalide.' })
  phone?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(clean) @IsEmail({}, { message: 'Adresse e-mail invalide.' }) @MaxLength(254)
  email?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(clean) @IsUrl(URL_OPTS, { message: 'Adresse du site invalide (commencez par https://).' }) @MaxLength(255)
  website?: string | null;
  @ApiPropertyOptional() @IsOptional() @Transform(clean) @IsString() @MaxLength(255)
  interventionZone?: string | null;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsUUID('all', { each: true })
  domainIds?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsUUID('all', { each: true })
  disabilityTypeIds?: string[];
}

export class FieldVisibilityDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() publicEmail?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() publicPhone?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() postalAddress?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() website?: boolean;
}

export class UpdateVisibilityDto {
  @ApiPropertyOptional({ description: "Apparaître dans l'annuaire (exige le consentement de publication)" })
  @IsOptional() @IsBoolean()
  isListed?: boolean;

  @ApiPropertyOptional({ description: 'Consentement de publication. false = retrait : retire aussitôt l’OPH de l’annuaire.' })
  @IsOptional() @IsBoolean()
  publicationConsent?: boolean;

  @ApiPropertyOptional({ description: 'E-mail PUBLIC (distinct de l’e-mail privé de l’organisation)' })
  @IsOptional() @Transform(clean) @IsEmail({}, { message: 'Adresse e-mail invalide.' }) @MaxLength(254)
  publicEmail?: string | null;

  @ApiPropertyOptional({ description: 'Téléphone PUBLIC' })
  @IsOptional() @Transform(clean) @Matches(PHONE, { message: 'Numéro de téléphone invalide.' })
  publicPhone?: string | null;

  @ApiPropertyOptional({ type: FieldVisibilityDto, description: 'Champ par champ : true = visible dans l’annuaire' })
  @IsOptional() @ValidateNested() @Type(() => FieldVisibilityDto)
  fieldVisibility?: FieldVisibilityDto;
}

export class InviteMemberDto {
  @ApiProperty() @Transform(lower) @IsEmail({}, { message: 'Adresse e-mail invalide.' }) @MaxLength(254)
  email: string;
  @ApiProperty() @Transform(clean) @IsString() @MinLength(1) @MaxLength(100)
  firstName: string;
  @ApiProperty() @Transform(clean) @IsString() @MinLength(1) @MaxLength(100)
  lastName: string;
  @ApiPropertyOptional() @IsOptional() @Transform(clean) @IsString() @MaxLength(120)
  jobTitle?: string | null;
  @ApiProperty({ enum: MEMBER_ROLES, description: 'Suppléant, Contributeur ou Consultation (un seul Président par OPH). Seul le Président nomme un Suppléant.' })
  @IsIn(MEMBER_ROLES as unknown as string[], { message: 'Le rôle doit être Suppléant, Contributeur ou Consultation.' })
  roleCode: MemberRoleCode;
}

export class ChangeMemberRoleDto {
  @ApiProperty({ enum: MEMBER_ROLES })
  @IsIn(MEMBER_ROLES as unknown as string[], { message: 'Le rôle doit être Suppléant, Contributeur ou Consultation.' })
  roleCode: MemberRoleCode;
}

export class ListOrganizationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() regionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() delegationId?: string;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED', 'ARCHIVED'] })
  @IsOptional() @IsIn(['ACTIVE', 'SUSPENDED', 'ARCHIVED']) status?: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
}

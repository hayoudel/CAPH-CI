import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsEmail, IsIn, IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

const clean = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const PHONE = /^[+0-9 ().-]{6,20}$/;

export class CreateRequestDto {
  @ApiProperty({ example: 'PM_ORGANISATION', description: 'Catégorie de demande (voir GET /memberships/categories)' })
  @IsString() @Matches(/^[A-Z_]{3,40}$/)
  categoryCode: string;

  @ApiProperty({ example: 'Awa Koné', description: 'Nom de la personne qui remplit le dossier' })
  @Transform(clean) @IsString() @MinLength(2) @MaxLength(150)
  applicantName: string;

  @ApiProperty({ description: 'Reçoit le code de suivi et les messages de la CAPH-CI' })
  @Transform(lower) @IsEmail({}, { message: 'Saisissez une adresse e-mail valide.' }) @MaxLength(254)
  applicantEmail: string;

  @ApiPropertyOptional() @IsOptional() @Transform(clean) @Matches(PHONE, { message: 'Numéro de téléphone invalide.' })
  applicantPhone?: string | null;

  @ApiPropertyOptional({ enum: ['FIRST', 'RENEWAL'], default: 'FIRST' }) @IsOptional() @IsIn(['FIRST', 'RENEWAL'])
  requestType?: 'FIRST' | 'RENEWAL';
}

export class UpdateRequestDto {
  @ApiPropertyOptional({ enum: ['FIRST', 'RENEWAL'] }) @IsOptional() @IsIn(['FIRST', 'RENEWAL'])
  requestType?: 'FIRST' | 'RENEWAL';

  @ApiPropertyOptional({ description: 'Obligatoire pour un renouvellement' })
  @IsOptional() @Transform(clean) @IsString() @MaxLength(50)
  existingMemberNumber?: string | null;

  @ApiPropertyOptional({ description: 'Délégation territoriale sollicitée' })
  @IsOptional() @Transform(clean) @IsUUID()
  delegationId?: string | null;

  @ApiPropertyOptional({ description: 'Motif d’un rattachement dérogatoire, le cas échéant' })
  @IsOptional() @Transform(clean) @IsString() @MaxLength(500)
  delegationOverrideReason?: string | null;

  @ApiPropertyOptional() @IsOptional() @Transform(clean) @IsString() @MinLength(2) @MaxLength(150)
  applicantName?: string;

  @ApiPropertyOptional() @IsOptional() @Transform(clean) @Matches(PHONE, { message: 'Numéro de téléphone invalide.' })
  applicantPhone?: string | null;

  @ApiPropertyOptional({
    description: 'Sections du formulaire (organization, representative, secretaryGeneral, treasurer). Seuls les champs envoyés sont modifiés ; "" efface un champ. Voir GET /memberships/requirements pour la liste des champs.',
    example: { organization: { name: 'Association Espoir', commune: 'Yopougon' }, representative: { name: 'Awa Koné' } },
  })
  @IsOptional() @IsObject()
  data?: Record<string, unknown>;
}

export class UploadDocumentDto {
  @ApiProperty({ example: 'LEGAL_REGISTRATION', description: 'Type de pièce (voir GET /memberships/requirements)' })
  @IsString() @Matches(/^[A-Z_]{2,40}$/)
  type: string;
}

export class SubmitRequestDto {
  @ApiProperty({ example: true, description: 'Je déclare exacts les renseignements fournis' })
  @Equals(true, { message: 'Vous devez certifier l’exactitude des renseignements.' })
  acceptAccuracy: boolean;

  @ApiProperty({ example: true, description: 'J’accepte les statuts, le règlement intérieur et les politiques institutionnelles' })
  @Equals(true, { message: 'Vous devez accepter les statuts, le règlement intérieur et les politiques.' })
  acceptStatutes: boolean;

  @ApiProperty({ example: true, description: 'J’ai pris connaissance du traitement de mes données' })
  @Equals(true, { message: 'Vous devez prendre connaissance du traitement des données.' })
  acceptDataProcessing: boolean;

  @ApiProperty({ example: 'Awa Koné', description: 'Nom du signataire (« Je soussigné(e) … »)' })
  @Transform(clean) @IsString() @MinLength(2) @MaxLength(150)
  signerName: string;

  @ApiPropertyOptional({ description: 'Consentement séparé à la publication dans l’annuaire (facultatif)' })
  @IsOptional() @IsBoolean()
  publicationConsent?: boolean;
}

export class TrackRequestDto {
  @ApiProperty({ example: 'CAPH-2026-000123' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^CAPH-\d{4}-\d{6}$/, { message: 'Référence invalide (exemple : CAPH-2026-000123).' })
  reference: string;

  @ApiProperty() @Transform(lower) @IsEmail({}, { message: 'Adresse e-mail invalide.' }) @MaxLength(254)
  email: string;

  @ApiProperty({ description: 'Code de suivi reçu par e-mail' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString() @MinLength(20) @MaxLength(200)
  code: string;
}

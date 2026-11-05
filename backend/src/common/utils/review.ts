import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { trimmed } from './files';

export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export class RejectContentDto {
  @ApiProperty({ description: 'Motif du refus, communiqué à l’organisation' })
  @Transform(trimmed) @IsString() @MinLength(5) @MaxLength(500)
  note: string;
}

/**
 * Qui voit quoi selon la validation :
 *  - le personnel gestionnaire voit tout ;
 *  - une OPH voit ce qui est validé + ses propres envois (en attente ou refusés) ;
 *  - les autres ne voient que le contenu validé.
 */
export function reviewScope(u: AuthenticatedUser, manage: boolean) {
  if (manage) return {};
  if (u.organizationId) return { OR: [{ reviewStatus: 'APPROVED' as const }, { organizationId: u.organizationId }] };
  return { reviewStatus: 'APPROVED' as const };
}

/**
 * Champs posés à la création : le personnel publie directement ; une OPH envoie « en attente de validation ».
 * `needsValidation = false` pour les contenus purement internes (documents) : jamais publics, donc pas de validation.
 */
export function creationReview(u: AuthenticatedUser, manage: boolean, needsValidation = true) {
  return manage
    ? { organizationId: null, reviewStatus: 'APPROVED' as const }
    : { organizationId: u.organizationId, reviewStatus: needsValidation ? ('PENDING' as const) : ('APPROVED' as const) };
}

/** Valeurs écrites lors d'une décision du personnel. */
export const decisionData = (u: AuthenticatedUser, status: ReviewStatus, note?: string) => ({
  reviewStatus: status, reviewedAt: new Date(), reviewedById: u.id, reviewNote: status === 'REJECTED' ? note ?? null : null,
});

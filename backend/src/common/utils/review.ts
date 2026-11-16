import { ForbiddenException } from '@nestjs/common';
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

/** Un membre ne modifie ni ne supprime que ce que SON organisation a ajouté ; le personnel gestionnaire peut tout. */
/** Président ou Suppléant de l'OPH : ils gardent la main sur tout ce que leur organisation a ajouté. */
export const isOrgLead = (u: AuthenticatedUser) => ['OPH_PRESIDENT', 'OPH_DEPUTY'].includes(u.organizationRole?.code ?? '');

/** Personnel autorisé, ou membre de l'organisation propriétaire qui est soit l'auteur, soit Président/Suppléant. */
export function assertOwnerOrManager(u: AuthenticatedUser, manage: boolean, row: { organizationId?: string | null; organization?: { id: string } | null; createdById?: string | null; authorId?: string | null }) {
  if (manage) return;
  const owner = row.organizationId ?? row.organization?.id ?? null;
  if (!u.organizationId || owner !== u.organizationId) {
    throw new ForbiddenException({ code: 'NOT_OWNER', message: 'Vous ne pouvez modifier ou supprimer que ce que votre organisation a ajouté.' });
  }
  const author = row.createdById ?? row.authorId ?? null;
  if (!isOrgLead(u) && author !== u.id) {
    throw new ForbiddenException({ code: 'NOT_AUTHOR', message: 'Seuls l’auteur, le Président ou son Suppléant peuvent modifier ou supprimer cet élément.' });
  }
}

/** Après une modification faite par une OPH, un contenu déjà validé ou refusé repasse « en attente de validation ». */
export const backToPending = { reviewStatus: 'PENDING' as const, reviewedAt: null, reviewedById: null, reviewNote: null };

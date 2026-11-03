import { Prisma } from '@prisma/client';

/**
 * SEUL point de sortie des données de l'annuaire public.
 * Les requêtes n'extraient que ces champs (select), et ce mapper n'expose les coordonnées
 * que si le Président les a rendues publiques. Aucun champ privé (e-mail privé, téléphone
 * privé, adresse du siège, n° de membre, référence légale) ne passe par ici.
 */
export const publicOrganizationSelect = {
  id: true, name: true, acronym: true, commune: true, interventionZone: true,
  fieldVisibility: true, publicEmail: true, publicPhone: true, website: true, postalAddress: true,
  region: { select: { id: true, name: true } },
  domains: { select: { id: true, label: true }, orderBy: { sortOrder: 'asc' } },
  disabilityTypes: { select: { id: true, label: true }, orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.OrganizationSelect;

export type PublicOrganizationRow = Prisma.OrganizationGetPayload<{ select: typeof publicOrganizationSelect }>;

export function toPublicOrganization(o: PublicOrganizationRow) {
  const v = (o.fieldVisibility ?? {}) as Record<string, boolean>;
  return {
    id: o.id,
    name: o.name,
    acronym: o.acronym,
    region: o.region,
    commune: o.commune,
    interventionZone: o.interventionZone,
    domains: o.domains,
    disabilityTypes: o.disabilityTypes,
    contact: {
      email: v.publicEmail ? o.publicEmail : null,
      phone: v.publicPhone ? o.publicPhone : null,
      website: v.website ? o.website : null,
      postalAddress: v.postalAddress ? o.postalAddress : null,
    },
  };
}

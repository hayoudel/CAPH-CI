/**
 * Contenu officiel issu du BULLETIN D'ADHÉSION ET D'ENGAGEMENT (Statuts et RI adoptés le 7 mars 2026).
 * À mettre à jour si le bulletin change. Rien n'est inventé : les références (art.) sont celles du bulletin.
 */
import { MembershipStatus } from '@prisma/client';

export const ELIGIBILITY = {
  intro: 'Peuvent solliciter l’adhésion (Statuts, art. 16 à 19 ; RI, art. 4 à 8) :',
  criteria: [
    'Les associations de ou pour personnes handicapées et les structures non lucratives régulièrement constituées intervenant dans le champ du handicap (catégorie « Organisation »).',
    'Les personnes handicapées, leurs parents, tuteurs ou représentants, et les personnes admises pour leur engagement reconnu (catégorie ouverte ultérieurement).',
    'Les personnes physiques ou morales apportant un soutien désintéressé, au titre des membres honoraires, désignés par l’Assemblée Générale sur proposition du Conseil d’Administration (catégorie ouverte ultérieurement).',
  ],
};

export const CONDITIONS = [
  'Une demande signée (ou confirmée en ligne par vos déclarations).',
  'L’acceptation des statuts, du règlement intérieur et des politiques applicables.',
  'Le paiement des droits prévus pour l’adhésion active, après acceptation du dossier.',
  'L’inscription au fichier national des membres.',
  'L’adhésion ne garantit pas automatiquement une aide ou une prestation.',
];

export const PROCEDURE = [
  'Compléter le formulaire et confirmer vos déclarations.',
  'Joindre les justificatifs adaptés à votre catégorie.',
  'Déposer le dossier : vous recevez une référence de dossier.',
  'Le dossier est examiné par les instances compétentes (l’admission relève du Conseil d’Administration).',
  'En cas d’admission, régler les droits applicables et recevoir un justificatif.',
  'Enregistrement au fichier national et rattachement territorial.',
  'Délivrance de la carte de membre et transmission par voie numérique de l’attestation d’adhésion, des Statuts, du Règlement intérieur et des politiques.',
];

/** Codes des lignes de barème (FeeSchedule) affichées pour chaque catégorie. */
export const FEES_BY_CATEGORY: Record<string, string[]> = {
  PM_ORGANISATION: ['ADHESION_PM', 'CARD_ANNUAL', 'DUES_AFFILIATED_ORG'],
};

export const DATA_PROTECTION_NOTICE =
  'Les informations recueillies servent à instruire la demande et à tenir le fichier national des membres. Les données sensibles sont traitées de façon confidentielle et uniquement pour les besoins pertinents. Toute demande de rectification peut être adressée au Secrétariat Permanent.';

export const STATUS_LABELS: Record<MembershipStatus, string> = {
  DRAFT: 'Brouillon (non déposé)',
  SUBMITTED: 'Dossier reçu',
  TO_COMPLETE: 'À compléter',
  UNDER_REVIEW: 'En cours d’examen',
  ADMITTED_PAYMENT_PENDING: 'Admis — paiement des droits en attente',
  ADJOURNED: 'Ajourné',
  REJECTED: 'Refusé',
  REGISTERED: 'Admis et enregistré',
  WITHDRAWN: 'Retiré',
};

/** Statuts où le demandeur peut modifier son dossier. */
export const EDITABLE_STATUSES: MembershipStatus[] = ['DRAFT', 'TO_COMPLETE'];
/** Statuts « ouverts » : une même organisation ne peut pas avoir deux dossiers ouverts. */
export const OPEN_STATUSES: MembershipStatus[] = ['DRAFT', 'SUBMITTED', 'TO_COMPLETE', 'UNDER_REVIEW', 'ADMITTED_PAYMENT_PENDING'];

import type { FieldSpec, FieldSpecs } from '../api/types';

export interface StepDef { id: string; title: string; short: string }
export const STEPS: StepDef[] = [
  { id: 'demandeur', title: 'Qui remplit la demande ?', short: 'Vous' },
  { id: 'organisation', title: 'Votre organisation', short: 'Organisation' },
  { id: 'activites', title: 'Activités et territoire', short: 'Activités' },
  { id: 'representant', title: 'Représentant habilité', short: 'Représentant' },
  { id: 'responsables', title: 'Secrétaire général et trésorier', short: 'Responsables' },
  { id: 'pieces', title: 'Pièces justificatives', short: 'Pièces' },
  { id: 'recapitulatif', title: 'Vérifier et déposer', short: 'Dépôt' },
];

/** Champs de chaque étape (chemin « section.champ »). */
export const STEP_FIELDS: Record<string, string[]> = {
  organisation: ['organization.name', 'organization.acronym', 'organization.legalReference', 'organization.address', 'organization.regionId', 'organization.commune', 'organization.phone', 'organization.email', 'organization.website'],
  activites: ['organization.interventionDomainIds', 'organization.disabilityTypeIds', 'organization.interventionZone'],
  representant: ['representative.name', 'representative.function', 'representative.phone', 'representative.email'],
  responsables: ['secretaryGeneral.name', 'secretaryGeneral.contact', 'treasurer.name', 'treasurer.contact'],
};
/** À quelle étape corriger un champ signalé manquant ou invalide. */
export function stepOfField(field: string): number {
  if (field.startsWith('documents.')) return 5;
  if (field === 'delegationId' || field === 'delegationOverrideReason') return 2;
  if (field === 'existingMemberNumber') return 0;
  const i = Object.entries(STEP_FIELDS).find(([, list]) => list.includes(field));
  return i ? STEPS.findIndex((s) => s.id === i[0]) : 6;
}

export const PHONE = /^[+0-9 ().-]{6,20}$/;
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const getSpec = (specs: FieldSpecs | null, path: string): FieldSpec | undefined => {
  const [section, key] = path.split('.');
  return specs?.[section]?.[key];
};

/** Contrôle d'un champ texte avant envoi : mêmes règles que le serveur, messages en français. */
export function checkField(spec: FieldSpec, value: unknown): string | null {
  if (spec.type === 'uuidList') {
    return spec.required && (!Array.isArray(value) || value.length === 0) ? 'Cochez au moins un choix.' : null;
  }
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return spec.required ? 'Ce champ est obligatoire.' : null;
  if (spec.max && s.length > spec.max) return `${spec.max} caractères au maximum.`;
  if (spec.type === 'email' && !EMAIL.test(s)) return 'Adresse e-mail invalide. Exemple : contact@association.ci';
  if (spec.type === 'phone' && !PHONE.test(s)) return 'Numéro invalide. Exemple : +225 07 00 00 00 00';
  if (spec.type === 'url' && !/^https?:\/\/\S+\.\S+$/i.test(s)) return 'Adresse invalide. Commencez par https://';
  return null;
}

export const REQUIREMENT_LABELS = { REQUIRED: 'Obligatoire', RECOMMENDED: 'Recommandée', OPTIONAL: 'Facultative', AFTER_ADMISSION: 'Après admission' } as const;
export const DOC_STATUS_LABELS = { PENDING: 'En attente de vérification', ACCEPTED: 'Acceptée', REJECTED: 'À remplacer' } as const;
export const PERIODICITY: Record<string, string> = { ONE_TIME: 'une seule fois', YEARLY: 'par an', MONTHLY: 'par mois' };

export const formatFcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n).replace(/ | /g, ' ')} FCFA`;
export const formatSize = (b: number) => (b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`);

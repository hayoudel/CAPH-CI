const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const dateTime = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const formatDate = (v?: string | Date | null) => (v ? date.format(new Date(v)) : '');
export const formatDateTime = (v?: string | Date | null) => (v ? dateTime.format(new Date(v)) : '');
/** « Mardi 3 novembre » : pour l'agenda. */
export const formatDay = (v: string | Date) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(v));

export const EVENT_TYPES: Record<string, string> = {
  MEETING: 'Réunion', TRAINING: 'Formation', GENERAL_ASSEMBLY: 'Assemblée générale', CONFERENCE: 'Conférence',
  FORUM: 'Forum', CAMPAIGN: 'Campagne', CEREMONY: 'Cérémonie',
};
export const EVENT_MODES: Record<string, string> = { ONLINE: 'En ligne', ONSITE: 'Sur place', HYBRID: 'Mixte' };
export const OPPORTUNITY_TYPES: Record<string, string> = {
  CALL_FOR_PROJECTS: 'Appel à projets', TRAINING: 'Formation', CONSULTATION: 'Consultation', JOB: 'Emploi',
  INTERNSHIP: 'Stage', GRANT: 'Subvention', OTHER: 'Autre',
};
export const REPORT_STATUSES: Record<string, string> = {
  RECEIVED: 'Reçus', IN_PROCESS: 'En traitement', PROCESSED: 'Traités', CORRECTION_REQUESTED: 'À corriger',
};
export const NEWS_STATUSES: Record<string, string> = {
  DRAFT: 'Brouillons', SUBMITTED: 'Soumises', IN_REVIEW: 'En cours de validation', CORRECTION: 'À corriger', APPROVED: 'Validées', REJECTED: 'Refusées', PUBLISHED: 'Publiées',
};
/** Couleur du badge d'un statut de validation (actualités, projets) : vert = bonne nouvelle, orange = action ou refus, gris = en attente. */
export const decisionBadge = (s: string) =>
  ['PUBLISHED', 'APPROVED', 'VALIDATED', 'ONGOING', 'COMPLETED'].includes(s) ? 'badge badge--green'
  : ['CORRECTION', 'REJECTED', 'TO_COMPLETE'].includes(s) ? 'badge badge--orange' : 'badge badge--grey';
export const DOCUMENT_CATEGORIES: Record<string, string> = {
  GUIDE: 'Guide', FORM: 'Formulaire', MEETING_MINUTES: 'Compte rendu', REFERENCE: 'Référence', OTHER: 'Autre',
};

export const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} octets` : bytes < 1_048_576 ? `${Math.round(bytes / 1024)} Ko` : `${(bytes / 1_048_576).toFixed(1).replace('.', ',')} Mo`;
export const EVENT_STATUSES: Record<string, string> = {
  PLANNED: 'Prévu', OPEN: 'Ouvert', REGISTRATION: 'Inscriptions ouvertes', CLOSED: 'Terminé', CANCELLED: 'Annulé',
};
export const OPPORTUNITY_STATUSES: Record<string, string> = { OPEN: 'Ouverte', CLOSED: 'Fermée', ENDED: 'Terminée' };

export const REPORT_TYPE_LABELS: Record<string, string> = { ACTIVITY: 'Rapport d’activité', FINANCIAL: 'Rapport financier', OTHER: 'Autre rapport' };

export const PROJECT_FILTERS: Record<string, string> = {
  ALL: 'Tous les projets', ONGOING: 'Projets en cours', COMPLETED: 'Projets terminés', PENDING: 'En attente de validation', MINE: 'Mes projets',
};
export const formatXof = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} F CFA`;

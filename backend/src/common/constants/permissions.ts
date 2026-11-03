/**
 * Codes de permission et matrice rôles → permissions.
 * Source unique : utilisée par le seed (base de données) et, en B2, par les guards.
 * Voir « Dossier de conception v2 », section 3.
 */
export const PERMISSIONS = {
  USER_MANAGE: 'user.manage',
  ORGANIZATION_READ: 'organization.read',
  ORGANIZATION_READ_ALL: 'organization.read.all',
  ORGANIZATION_UPDATE: 'organization.update',
  ORGANIZATION_VISIBILITY_UPDATE: 'organization.visibility.update',
  ORGANIZATION_MEMBERS_MANAGE: 'organization.members.manage',
  DOCUMENT_READ: 'document.read',
  DOCUMENT_MANAGE: 'document.manage',
  OPPORTUNITY_READ: 'opportunity.read',
  OPPORTUNITY_MANAGE: 'opportunity.manage',
  COMMUNICATION_READ: 'communication.read',
  COMMUNICATION_MANAGE: 'communication.manage',
  EVENT_READ: 'event.read',
  EVENT_MANAGE: 'event.manage',
  REPORT_CREATE: 'report.create',
  REPORT_READ: 'report.read',
  REPORT_REVIEW: 'report.review',
  NEWS_PROPOSE: 'news.propose',
  NEWS_REVIEW: 'news.review',
  DIRECTORY_READ: 'directory.read',
  MEMBERSHIP_READ: 'membership.read',
  MEMBERSHIP_REVIEW: 'membership.review',
  MEMBERSHIP_DECIDE: 'membership.decide',
  MEMBERSHIP_REGISTER: 'membership.register',
  AUDIT_READ: 'audit.read',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as PermissionCode[];
const P = PERMISSIONS;

/** Lectures communes à tout le personnel CAPH-CI. */
const STAFF_READS: PermissionCode[] = [
  P.DOCUMENT_READ, P.OPPORTUNITY_READ, P.COMMUNICATION_READ, P.EVENT_READ, P.DIRECTORY_READ,
];

export type RoleScopeName = 'GLOBAL' | 'ORGANIZATION';

export const ROLES: {
  code: string; label: string; scope: RoleScopeName; permissions: PermissionCode[];
}[] = [
  // ── Personnel CAPH-CI ──
  { code: 'ADMIN', label: 'Administrateur général', scope: 'GLOBAL', permissions: ALL_PERMISSIONS },
  {
    code: 'MEMBERSHIP_MANAGER', label: 'Gestionnaire des adhésions', scope: 'GLOBAL',
    permissions: [P.MEMBERSHIP_READ, P.MEMBERSHIP_REVIEW, P.MEMBERSHIP_REGISTER, ...STAFF_READS],
  },
  {
    // Habilitation individuelle à enregistrer la décision officielle (instance : CA).
    // À ajouter EN PLUS d'un autre rôle (un utilisateur peut cumuler plusieurs rôles).
    code: 'DECISION_MAKER', label: 'Habilité à enregistrer les décisions', scope: 'GLOBAL',
    permissions: [P.MEMBERSHIP_READ, P.MEMBERSHIP_DECIDE],
  },
  {
    code: 'DELEGATION_MANAGER', label: 'Responsable de délégation', scope: 'GLOBAL',
    permissions: [
      P.ORGANIZATION_READ_ALL, P.MEMBERSHIP_READ, P.REPORT_READ, P.REPORT_REVIEW, ...STAFF_READS,
    ],
  },
  {
    code: 'COMMUNICATION_MANAGER', label: 'Responsable communication', scope: 'GLOBAL',
    permissions: [
      P.DOCUMENT_MANAGE, P.COMMUNICATION_MANAGE, P.EVENT_MANAGE, P.NEWS_REVIEW, ...STAFF_READS,
    ],
  },
  {
    code: 'OPPORTUNITY_MANAGER', label: 'Responsable opportunités', scope: 'GLOBAL',
    permissions: [P.OPPORTUNITY_MANAGE, ...STAFF_READS],
  },
  // ── Rôles au sein d'une OPH ──
  {
    code: 'OPH_PRESIDENT', label: "Président de l'OPH", scope: 'ORGANIZATION',
    permissions: [
      P.ORGANIZATION_READ, P.ORGANIZATION_UPDATE, P.ORGANIZATION_VISIBILITY_UPDATE,
      P.ORGANIZATION_MEMBERS_MANAGE, P.DOCUMENT_READ, P.OPPORTUNITY_READ, P.COMMUNICATION_READ,
      P.EVENT_READ, P.REPORT_CREATE, P.REPORT_READ, P.NEWS_PROPOSE, P.DIRECTORY_READ,
    ],
  },
  {
    // Équivalent d'« éditeur » : agit à la place du Président quand il est absent. Mêmes droits que lui,
    // mais il ne peut ni modifier/retirer le Président, ni nommer ou retirer un autre Suppléant.
    code: 'OPH_DEPUTY', label: 'Suppléant du Président', scope: 'ORGANIZATION',
    permissions: [
      P.ORGANIZATION_READ, P.ORGANIZATION_UPDATE, P.ORGANIZATION_VISIBILITY_UPDATE,
      P.ORGANIZATION_MEMBERS_MANAGE, P.DOCUMENT_READ, P.OPPORTUNITY_READ, P.COMMUNICATION_READ,
      P.EVENT_READ, P.REPORT_CREATE, P.REPORT_READ, P.NEWS_PROPOSE, P.DIRECTORY_READ,
    ],
  },
  {
    code: 'OPH_CONTRIBUTOR', label: 'Contributeur', scope: 'ORGANIZATION',
    permissions: [
      P.ORGANIZATION_READ, P.DOCUMENT_READ, P.OPPORTUNITY_READ, P.COMMUNICATION_READ,
      P.EVENT_READ, P.REPORT_CREATE, P.REPORT_READ, P.NEWS_PROPOSE, P.DIRECTORY_READ,
    ],
  },
  {
    code: 'OPH_VIEWER', label: 'Consultation', scope: 'ORGANIZATION',
    permissions: [
      P.ORGANIZATION_READ, P.DOCUMENT_READ, P.OPPORTUNITY_READ, P.COMMUNICATION_READ,
      P.EVENT_READ, P.REPORT_READ, P.DIRECTORY_READ,
    ],
  },
];

/** Utilisateur connecté tel que renvoyé par l'API (permissions recalculées par le serveur à chaque requête). */
export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  permissions: string[];
  roleCodes: string[];
  organizationId: string | null;
  organizationName: string | null;
  organizationRole: { code: string; label: string } | null;
  delegationIds: string[];
  isGlobalScope: boolean;
}

export interface SessionResponse { accessToken: string; expiresIn: number; user: SessionUser }

export interface Paginated<T> { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }

export interface EventItem { id: string; title: string; type: string; mode: string; location: string | null; startsAt: string; endsAt: string | null; status: string }
export interface OpportunityItem { id: string; reference: string; title: string; type: string; deadline: string | null; effectiveStatus: string }
export interface CommunicationItem { id: string; title: string; excerpt?: string; category: string | null; publishedAt: string; isRead: boolean }
export interface DocumentItem { id: string; title: string; category: string; isFeatured: boolean; publishedAt: string }

export interface MemberDashboard {
  kind: 'MEMBER';
  organization: { id: string; name: string; memberNumber: string | null; status: string; registeredAt: string | null; isListed: boolean };
  role: { code: string; label: string } | null;
  unreadCommunications: number;
  latestCommunications: CommunicationItem[];
  upcomingEvents: EventItem[];
  openOpportunities: OpportunityItem[];
  latestDocuments: DocumentItem[];
  reports: Record<string, number> | null;
  newsProposals: Record<string, number> | null;
}

export interface StaffDashboard {
  kind: 'STAFF';
  roles: string[];
  memberships: { total: number; toProcess: number; overdue: number; overdueAfterDays: number; byStatus: Record<string, number>; labels: Record<string, string> } | null;
  reports: { received: number; inProcess: number } | null;
  newsToReview: number | null;
  activeOrganizations: number | null;
  unreadCommunications: number | null;
  upcomingEvents: EventItem[];
  openOpportunities: OpportunityItem[];
}

export type Dashboard = MemberDashboard | StaffDashboard;

// ── Lot F2 : organisation, équipe, annuaire ──
export interface RefItem { id: string; label: string }
export interface OrganizationProfile {
  id: string; name: string; acronym: string | null; legalReference: string | null; status: string;
  memberNumber: string | null; registeredAt: string | null;
  commune: string | null; address: string | null; postalAddress: string | null;
  phone: string | null; email: string | null; website: string | null; interventionZone: string | null;
  region: { id: string; name: string } | null; delegation: { id: string; name: string } | null;
  domains: { id: string; code: string; label: string }[];
  disabilityTypes: { id: string; code: string; label: string }[];
  memberCount: number;
}
export interface Visibility {
  isListed: boolean; publicationConsent: boolean; publicationConsentAt: string | null;
  publicEmail: string | null; publicPhone: string | null;
  fieldVisibility: { publicEmail: boolean; publicPhone: boolean; postalAddress: boolean; website: boolean };
}
export interface TeamMember {
  userId: string; firstName: string; lastName: string; jobTitle: string | null;
  role: { code: string; label: string }; status: 'INVITED' | 'ACTIVE' | 'DISABLED';
  email?: string; lastLoginAt?: string | null;
}
export interface DirectoryFilters { regions: { id: string; name: string }[]; domains: RefItem[]; disabilityTypes: RefItem[] }
export interface PublicOrganization {
  id: string; name: string; acronym: string | null; region: { id: string; name: string } | null;
  commune: string | null; interventionZone: string | null;
  domains: RefItem[]; disabilityTypes: RefItem[];
  contact: { email: string | null; phone: string | null; website: string | null; postalAddress: string | null };
}
export interface MyProfile {
  id: string; email: string; firstName: string; lastName: string; phone: string | null; jobTitle: string | null;
  contactPreference: 'EMAIL' | 'PHONE'; status: string; lastLoginAt: string | null;
  organization: { id: string; name: string; role: { code: string; label: string } | null } | null;
}

// ── Lot F3 : adhésion ──
export interface FieldSpec { label: string; type: 'text' | 'email' | 'phone' | 'url' | 'uuid' | 'uuidList'; required: boolean; max?: number }
export type FieldSpecs = Record<string, Record<string, FieldSpec>>;
export interface DocSpec { type: string; label: string; requirement: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL' | 'AFTER_ADMISSION' }
export interface MembershipRequirements {
  category: { code: string; label: string; description: string | null; isOpen: boolean };
  eligibility: { intro: string; criteria: string[] };
  conditions: string[];
  procedure: string[];
  documents: DocSpec[];
  fees: { code: string; label: string; amountFcfa: number; periodicity: string }[];
  feesNotice: string;
  declarations: { acceptAccuracy: string; acceptStatutes: string; acceptDataProcessing: string };
  fields: FieldSpecs | null;
  options: {
    regions: { id: string; name: string }[];
    delegations: { id: string; name: string; regionId: string | null }[];
    domains: RefItem[]; disabilityTypes: RefItem[];
  };
}
export interface MembershipCategory { code: string; label: string; description: string | null; isOpen: boolean }
export interface MembershipDocument {
  id: string; type: string; label: string; originalName: string; sizeBytes: number; mimeType: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'; reviewNote: string | null;
}
export interface MembershipRequestView {
  id: string; reference: string | null; status: string; statusLabel: string; canEdit: boolean;
  category: { code: string; label: string }; requestType: 'FIRST' | 'RENEWAL'; existingMemberNumber: string | null;
  applicant: { name: string; email: string; phone: string | null };
  delegationId: string | null; delegationOverrideReason: string | null;
  data: Record<string, Record<string, unknown>>;
  documents: MembershipDocument[]; documentSpecs: DocSpec[];
  completeness: { missingFields: { field: string; message: string }[]; missingDocuments: { type: string; label: string }[]; complete: boolean };
  submittedAt: string | null; updatedAt: string;
}
export interface TrackResult {
  reference: string; category: string; status: string; statusLabel: string; canEdit: boolean;
  submittedAt: string | null; lastActionAt: string | null;
  timeline: { date: string; label: string }[]; messages: { date: string; text: string }[];
  documents: { label: string; status: 'PENDING' | 'ACCEPTED' | 'REJECTED'; note: string | null }[];
  decision: { outcome: string; outcomeLabel: string; decidedAt: string; motive: string | null } | null;
}

// ── Lot F5a : contenus en lecture (documents, opportunités, communications, agenda) ──
export interface FileInfo { originalName: string; mimeType: string; sizeBytes: number }
export interface LibraryDocument {
  id: string; title: string; description: string | null; category: string; accessLevel: string;
  isFeatured: boolean; publishedAt: string; file: FileInfo;
}
export interface Opportunity {
  id: string; reference: string; title: string; summary: string; body: string | null; type: string;
  status: string; effectiveStatus: 'OPEN' | 'CLOSED' | 'ENDED'; deadline: string | null; audience: string | null;
  modality: string | null; hasSheet: boolean; sheet: FileInfo | null; createdAt: string;
}
export interface Communication {
  id: string; kind: 'INTERNAL' | 'EXTERNAL'; category: string | null; title: string; excerpt?: string; body?: string;
  senderLabel: string; publishedAt: string; isRead: boolean;
}
export interface AgendaEvent {
  id: string; type: string; title: string; description: string | null; startsAt: string; endsAt: string | null;
  mode: string; location: string | null; status: string; region: { id: string; name: string } | null;
}

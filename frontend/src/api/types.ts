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

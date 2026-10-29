import { apiGet, apiPost } from './client';
import type {
  AgendaEvent, AuthSession, Delegation, Domain, FormReceipt, HomeData, MediaItem, NewsItem, OPH,
  Opportunity, Paginated, Project, Resource, SiteSettings, Testimonial,
} from '../types';
import type {
  ContactValues, DonationValues, FundingValues, LoginValues, MembershipValues, PartnershipValues, QuoteValues,
} from '../schemas/forms';

export type ListParams = { page?: number; pageSize?: number; q?: string };

export const api = {
  settings: () => apiGet<SiteSettings>('/settings'),
  home: () => apiGet<HomeData>('/home'),
  domains: () => apiGet<Domain[]>('/domains'),
  domain: (id: string) => apiGet<Domain>(`/domains/${id}`),
  projects: (params?: ListParams) => apiGet<Paginated<Project>>('/projects', params),
  project: (id: string) => apiGet<Project>(`/projects/${id}`),
  news: (params?: ListParams) => apiGet<Paginated<NewsItem>>('/news', params),
  newsItem: (id: string) => apiGet<NewsItem>(`/news/${id}`),
  agenda: () => apiGet<AgendaEvent[]>('/agenda'),
  agendaEvent: (id: string) => apiGet<AgendaEvent>(`/agenda/${id}`),
  delegations: () => apiGet<Delegation[]>('/delegations'),
  delegation: (id: string) => apiGet<Delegation>(`/delegations/${id}`),
  opportunities: () => apiGet<Opportunity[]>('/opportunities'),
  opportunity: (id: string) => apiGet<Opportunity>(`/opportunities/${id}`),
  organizations: () => apiGet<OPH[]>('/organizations'),
  organization: (id: string) => apiGet<OPH>(`/organizations/${id}`),
  media: () => apiGet<MediaItem[]>('/media'),
  resources: () => apiGet<Resource[]>('/resources'),
  resource: (id: string) => apiGet<Resource>(`/resources/${id}`),
  testimonials: () => apiGet<Testimonial[]>('/testimonials'),

  submitContact: (v: ContactValues) => apiPost<FormReceipt>('/forms/contact', v),
  submitMembership: (v: MembershipValues) => apiPost<FormReceipt>('/forms/membership', v),
  submitPartnership: (v: PartnershipValues) => apiPost<FormReceipt>('/forms/partnership', v),
  submitQuoteRequest: (v: QuoteValues) => apiPost<FormReceipt>('/forms/quote-request', v),
  submitFundingInterest: (v: FundingValues) => apiPost<FormReceipt>('/forms/funding-interest', v),
  submitDonationInterest: (v: DonationValues) => apiPost<FormReceipt>('/forms/donation-interest', v),

  login: (v: LoginValues) => apiPost<AuthSession>('/auth/login', v),
  logout: () => apiPost<{ ok: true }>('/auth/logout', {}),
};

import { useQuery } from '@tanstack/react-query';
import { api, type ListParams } from '../api';

export const queryKeys = {
  settings: ['settings'] as const,
  home: ['home'] as const,
  domains: ['domains'] as const,
  projects: (p?: ListParams) => ['projects', p ?? {}] as const,
  news: (p?: ListParams) => ['news', p ?? {}] as const,
  agenda: ['agenda'] as const,
  delegations: ['delegations'] as const,
  opportunities: ['opportunities'] as const,
  organizations: ['organizations'] as const,
  media: ['media'] as const,
  resources: ['resources'] as const,
  testimonials: ['testimonials'] as const,
};

export const useSettings = () => useQuery({ queryKey: queryKeys.settings, queryFn: api.settings });
export const useHome = () => useQuery({ queryKey: queryKeys.home, queryFn: api.home });
export const useDomains = () => useQuery({ queryKey: queryKeys.domains, queryFn: api.domains });
export const useProjects = (params?: ListParams) =>
  useQuery({ queryKey: queryKeys.projects(params), queryFn: () => api.projects(params), select: d => d.items });
export const useNews = (params?: ListParams) =>
  useQuery({ queryKey: queryKeys.news(params), queryFn: () => api.news(params), select: d => d.items });
export const useAgenda = () => useQuery({ queryKey: queryKeys.agenda, queryFn: api.agenda });
export const useDelegations = () => useQuery({ queryKey: queryKeys.delegations, queryFn: api.delegations });
export const useOpportunities = () => useQuery({ queryKey: queryKeys.opportunities, queryFn: api.opportunities });
export const useOrganizations = () => useQuery({ queryKey: queryKeys.organizations, queryFn: api.organizations });
export const useMedia = () => useQuery({ queryKey: queryKeys.media, queryFn: api.media });
export const useResources = () => useQuery({ queryKey: queryKeys.resources, queryFn: api.resources });
export const useTestimonials = () => useQuery({ queryKey: queryKeys.testimonials, queryFn: api.testimonials });

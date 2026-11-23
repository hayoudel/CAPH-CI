import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

/** Régions administratives (liste de référence, rarement modifiée : mise en cache une heure). */
export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: async () => (await api<{ regions: { id: string; name: string }[] }>('/annuaire/filters')).regions,
    staleTime: 3_600_000,
  });
}

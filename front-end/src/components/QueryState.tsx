import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

type Props = {
  queries: UseQueryResult<unknown, Error>[] | UseQueryResult<unknown, Error>;
  children: () => ReactNode;
};

/**
 * Gère les états chargement / erreur pour les pages alimentées par l'API.
 * Une fois les données disponibles, le rendu est strictement celui de la maquette.
 */
export default function QueryState({ queries, children }: Props) {
  const list = Array.isArray(queries) ? queries : [queries];
  const failed = list.find(q => q.isError);

  if (failed) {
    return (
      <div role="alert" className="min-h-[50vh] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900 font-display mb-2">Impossible de charger le contenu</h1>
        <p className="text-slate-600 mb-6 max-w-md">{failed.error.message}</p>
        <button type="button" onClick={() => list.forEach(q => q.isError && void q.refetch())} className="btn-primary">
          Réessayer
        </button>
      </div>
    );
  }

  if (list.some(q => q.isPending)) {
    return (
      <div role="status" aria-live="polite" className="min-h-[50vh] flex items-center justify-center px-4 text-slate-600">
        <span className="sr-only">Chargement en cours…</span>
        <div aria-hidden="true" className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-[#006B35] animate-spin" />
      </div>
    );
  }

  return <>{children()}</>;
}

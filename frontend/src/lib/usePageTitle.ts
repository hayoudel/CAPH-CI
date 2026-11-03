import { useEffect } from 'react';

/** Titre de l'onglet propre à chaque page (repère pour les lecteurs d'écran et l'historique). */
export function usePageTitle(title: string) {
  useEffect(() => { document.title = `${title} — CAPH-CI`; }, [title]);
}

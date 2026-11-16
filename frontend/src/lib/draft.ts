/**
 * Le dossier en cours (identifiant + code de suivi) est gardé dans sessionStorage : il survit à un rechargement
 * de page mais disparaît à la fermeture de l'onglet, ce qui évite de laisser un code personnel sur un ordinateur partagé.
 */
const KEY = 'caphci.adhesion';
export interface Draft { id: string; code: string }

export function loadDraft(): Draft | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    return v && typeof v.id === 'string' && typeof v.code === 'string' ? v : null;
  } catch { return null; }
}
export function saveDraft(d: Draft) { try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { /* stockage indisponible */ } }
export function clearDraft() { try { sessionStorage.removeItem(KEY); } catch { /* ignoré */ } }

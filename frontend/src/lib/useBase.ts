import { useLocation } from 'react-router-dom';

/** Les pages Documents, Opportunités et Agenda existent dans l'espace membre (/espace) et dans celui du personnel (/admin). */
export function useBase(): '/admin' | '/espace' {
  return useLocation().pathname.startsWith('/admin') ? '/admin' : '/espace';
}

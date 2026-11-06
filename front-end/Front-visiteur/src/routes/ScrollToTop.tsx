import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router';

/** Remonte en haut de page à chaque navigation (sauf retour/avance du navigateur). */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if (type !== 'POP') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname, type]);
  return null;
}

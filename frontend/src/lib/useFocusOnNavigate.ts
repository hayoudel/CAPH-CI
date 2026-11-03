import { useEffect, useRef, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';

/** À chaque changement de page, le focus passe au contenu : un lecteur d'écran ou le clavier repart du haut de la nouvelle page. */
export function useFocusOnNavigate(ref: RefObject<HTMLElement>) {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    ref.current?.focus({ preventScroll: false });
    window.scrollTo?.({ top: 0 });
  }, [pathname, ref]);
}

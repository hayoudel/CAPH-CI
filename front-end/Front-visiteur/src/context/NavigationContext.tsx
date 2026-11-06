import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { pageFromPathname, pagePath, type PageName } from '../routes/paths';

export type { PageName };

type Navigation = {
  currentPage: PageName;
  selectedId: string | null;
  navigate: (page: PageName, id?: string) => void;
  goBack: () => void;
};

/**
 * Couche de compatibilité : conserve l'API `useNavigation()` utilisée par les
 * pages de la maquette, mais s'appuie désormais entièrement sur React Router
 * (URL réelles, historique du navigateur, liens partageables).
 */
export function useNavigation(): Navigation {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { page, id } = useMemo(() => pageFromPathname(location.pathname), [location.pathname]);

  const navigate = useCallback(
    (target: PageName, targetId?: string) => routerNavigate(pagePath(target, targetId)),
    [routerNavigate],
  );

  const goBack = useCallback(() => {
    // `key === 'default'` : première entrée de l'historique, on retourne à l'accueil.
    if (location.key !== 'default') routerNavigate(-1);
    else routerNavigate('/');
  }, [location.key, routerNavigate]);

  return {
    currentPage: page,
    selectedId: page === 'donate' ? searchParams.get('source') : id,
    navigate,
    goBack,
  };
}

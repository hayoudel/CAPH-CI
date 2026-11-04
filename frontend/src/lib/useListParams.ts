import { useSearchParams } from 'react-router-dom';

/** Lit et modifie les filtres d'une liste dans l'adresse de la page (on peut donc la partager ou revenir en arrière). */
export function useListParams() {
  const [params, setParams] = useSearchParams();
  const get = (k: string) => params.get(k) ?? '';
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next);
  };
  const page = Number(params.get('page') ?? 1) || 1;
  const reset = () => setParams({});
  const has = (...keys: string[]) => keys.some((k) => params.get(k));
  return { get, set, page, reset, has };
}

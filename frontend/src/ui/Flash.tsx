import { useEffect, useRef } from 'react';
import { Alert } from './Alert';

export interface Notice { kind: 'success' | 'error' | 'info'; title: string; text?: string }

/** Message de retour (enregistré, erreur…) : le focus s'y place pour que le clavier et les lecteurs d'écran le trouvent. */
export function Flash({ notice }: { notice: Notice | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (notice) ref.current?.focus(); }, [notice]);
  if (!notice) return null;
  return <Alert ref={ref} kind={notice.kind} title={notice.title}>{notice.text}</Alert>;
}

export const errorNotice = (e: unknown, title = 'Action impossible'): Notice => ({
  kind: 'error', title, text: e instanceof Error ? e.message : 'Une erreur est survenue. Réessayez.',
});

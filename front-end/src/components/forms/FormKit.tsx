import { useEffect, useRef } from 'react';
import type { FieldErrors, FieldValues } from 'react-hook-form';

/** Attributs ARIA d'un champ en erreur (aria-invalid + aria-describedby). */
export function a11y(errors: FieldErrors<FieldValues>, name: string, id: string, hintId?: string) {
  const invalid = Boolean(errors[name]);
  const describedBy = [invalid ? `${id}-error` : null, hintId ?? null].filter(Boolean).join(' ') || undefined;
  return { id, 'aria-invalid': invalid || undefined, 'aria-describedby': describedBy } as const;
}

export function FieldError({ errors, name, id }: { errors: FieldErrors<FieldValues>; name: string; id: string }) {
  const message = errors[name]?.message;
  if (typeof message !== 'string') return null;
  return <p id={`${id}-error`} className="mt-1 text-xs font-semibold text-red-700">{message}</p>;
}

type SummaryProps = {
  errors: FieldErrors<FieldValues>;
  /** Associe le nom du champ à l'id de l'élément HTML (par défaut : identiques). */
  ids?: Record<string, string>;
  show: boolean;
  submitCount: number;
};

/** Résumé d'erreurs placé avant le formulaire ; reçoit le focus après une soumission invalide. */
export function ErrorSummary({ errors, ids = {}, show, submitCount }: SummaryProps) {
  const ref = useRef<HTMLDivElement>(null);
  const entries = Object.entries(errors).filter(([, e]) => typeof e?.message === 'string');

  useEffect(() => {
    if (submitCount > 0 && entries.length > 0) ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount]);

  if (!show || entries.length === 0) return null;
  return (
    <div ref={ref} tabIndex={-1} role="alert" aria-labelledby="error-summary-title" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm">
      <h3 id="error-summary-title" className="font-bold text-red-800 mb-2">
        {entries.length === 1 ? 'Une erreur empêche l’envoi du formulaire' : `${entries.length} erreurs empêchent l’envoi du formulaire`}
      </h3>
      <ul className="list-disc pl-5 space-y-1 text-red-800">
        {entries.map(([name, err]) => (
          <li key={name}>
            <a href={`#${ids[name] ?? name}`} className="underline font-medium"
              onClick={e => { e.preventDefault(); document.getElementById(ids[name] ?? name)?.focus(); }}>
              {String(err?.message)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ApiErrorAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800">
      {message}
    </div>
  );
}

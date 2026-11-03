import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import type { TrackResult } from '../../api/types';
import { DOC_STATUS_LABELS, EMAIL } from '../../lib/adhesion';
import { formatDate, formatDateTime } from '../../lib/format';
import { usePageTitle } from '../../lib/usePageTitle';
import { Alert } from '../../ui/Alert';
import { Button, LinkButton } from '../../ui/Button';
import { TextField } from '../../ui/Field';
import { errorNotice, Flash } from '../../ui/Flash';

export function TrackPage() {
  usePageTitle('Suivre mon dossier');
  const [f, setF] = useState({ reference: '', email: '', code: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TrackResult | null>(null);
  const track = useMutation({
    mutationFn: () => api<TrackResult>('/memberships/track', { method: 'POST', auth: false, body: { reference: f.reference.trim(), email: f.email.trim(), code: f.code.trim() } }),
    onSuccess: setResult,
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    const next: Record<string, string> = {};
    if (!/^CAPH-\d{4}-\d{6}$/i.test(f.reference.trim())) next.reference = 'Référence invalide. Exemple : CAPH-2026-000123';
    if (!EMAIL.test(f.email.trim())) next.email = 'Adresse e-mail invalide.';
    if (f.code.trim().length < 20) next.code = 'Collez le code de suivi complet reçu par e-mail.';
    setErrors(next);
    if (!Object.keys(next).length) track.mutate();
  }

  const notFound = track.error instanceof ApiError && track.error.status === 404;
  return (
    <div className="container container--narrow stack">
      <div className="page-head">
        <h1>Suivre mon dossier</h1>
        <p>Saisissez les trois informations reçues par e-mail lors du dépôt de votre dossier.</p>
      </div>

      <form className="panel" onSubmit={submit} noValidate aria-label="Rechercher mon dossier">
        {track.isError && (notFound
          ? <Flash notice={{ kind: 'error', title: 'Dossier introuvable', text: 'Vérifiez la référence, l’adresse e-mail et le code de suivi. Les trois doivent correspondre à ceux du message reçu.' }} />
          : <Flash notice={errorNotice(track.error, 'Recherche impossible')} />)}
        <TextField label="Référence du dossier" required value={f.reference} error={errors.reference} hint="Exemple : CAPH-2026-000123" autoComplete="off"
          onChange={(e) => setF({ ...f, reference: e.target.value })} />
        <TextField label="Adresse e-mail utilisée pour la demande" type="email" required value={f.email} error={errors.email} autoComplete="email"
          onChange={(e) => setF({ ...f, email: e.target.value })} />
        <TextField label="Code de suivi" required value={f.code} error={errors.code} autoComplete="off" spellCheck={false}
          hint="Une longue suite de lettres et de chiffres. Copiez-la depuis votre e-mail." onChange={(e) => setF({ ...f, code: e.target.value })} />
        <Button type="submit" loading={track.isPending}>{track.isPending ? 'Recherche…' : 'Voir mon dossier'}</Button>
      </form>

      {result && (
        <section className="panel" aria-labelledby="resultat" aria-live="polite">
          <h2 id="resultat" className="panel__title">Dossier {result.reference}</h2>
          <p><span className="badge badge--green">{result.statusLabel}</span> <span className="item__meta">{result.category}{result.submittedAt ? ` · déposé le ${formatDate(result.submittedAt)}` : ''}</span></p>

          {result.decision && (
            <Alert kind={result.decision.outcome === 'ADMITTED' ? 'success' : 'info'} title={`Décision : ${result.decision.outcomeLabel}`}>
              {result.decision.motive ?? undefined}
            </Alert>
          )}
          {result.status === 'TO_COMPLETE' && (
            <Alert kind="info" title="Des compléments sont demandés">
              Ouvrez le message reçu par e-mail pour reprendre votre dossier, ou contactez la CAPH-CI.
            </Alert>
          )}

          {result.messages.length > 0 && (
            <>
              <h3>Messages de la CAPH-CI</h3>
              <ul className="plain-list">
                {result.messages.map((m, i) => (
                  <li key={i}><span className="item__meta">{formatDateTime(m.date)}</span><span style={{ display: 'block' }}>{m.text}</span></li>
                ))}
              </ul>
            </>
          )}

          <h3 style={{ marginTop: 'var(--space-5)' }}>Avancement</h3>
          <ol className="timeline">
            {result.timeline.map((t, i) => <li key={i}><strong>{t.label}</strong><br /><span className="item__meta">{formatDateTime(t.date)}</span></li>)}
          </ol>

          {result.documents.length > 0 && (
            <>
              <h3 style={{ marginTop: 'var(--space-5)' }}>Pièces</h3>
              <ul className="plain-list">
                {result.documents.map((d, i) => (
                  <li key={i}>
                    <span className="item__title">{d.label}</span>
                    <span className="item__meta">{DOC_STATUS_LABELS[d.status]}{d.note ? ` : ${d.note}` : ''}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="item__meta" style={{ marginTop: 'var(--space-4)' }}>La réception d’un dossier ne vaut pas admission : seules les instances compétentes de la CAPH-CI décident.</p>
        </section>
      )}
      <LinkButton to="/adhesion" variant="secondary">Retour à la page d’adhésion</LinkButton>
    </div>
  );
}

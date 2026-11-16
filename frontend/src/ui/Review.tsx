import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { ReviewFields } from '../api/types';
import { Button } from './Button';
import { errorNotice, type Notice } from './Flash';
import { TextAreaField } from './Field';

export const REVIEW_OPTIONS = [
  { value: 'PENDING', label: 'En attente de validation' },
  { value: 'APPROVED', label: 'Validés' },
  { value: 'REJECTED', label: 'Refusés' },
];
export const REVIEW_LABELS: Record<string, string> = { PENDING: 'En attente de validation', APPROVED: 'Validé', REJECTED: 'Refusé' };

/** Qui a proposé le contenu, et où en est sa validation. Rien n'est affiché pour un contenu publié directement par la CAPH-CI. */
export function ReviewInfo({ item }: { item: ReviewFields }) {
  if (!item.organization && item.reviewStatus === 'APPROVED') return null;
  return (
    <p className="item__meta" style={{ margin: 'var(--space-2) 0 0' }}>
      {item.organization && <span className="badge badge--grey">Proposé par {item.organization.name}</span>}{' '}
      {item.reviewStatus !== 'APPROVED' && <span className={item.reviewStatus === 'PENDING' ? 'badge badge--orange' : 'badge badge--grey'}>{REVIEW_LABELS[item.reviewStatus]}</span>}
      {item.reviewStatus === 'PENDING' && <> Visible seulement par son organisation et la CAPH-CI, en attendant la validation.</>}
      {item.reviewStatus === 'REJECTED' && item.reviewNote && <> Motif : {item.reviewNote}</>}
    </p>
  );
}

/** Boutons du personnel : valider ou refuser (avec motif) un contenu proposé par une OPH. */
/** `onNotice` : le message est affiché par la page, car la carte peut disparaître de la liste après la décision (filtre « en attente »). */
export function ReviewActions({ item, path, canReview, onNotice }: { item: { id: string; title: string } & ReviewFields; path: string; canReview: boolean; onNotice: (n: Notice) => void }) {
  const qc = useQueryClient();
  const [refusing, setRefusing] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const done = (n: Notice) => { onNotice(n); setRefusing(false); setNote(''); qc.invalidateQueries({ queryKey: [path.slice(1)] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); };
  const approve = useMutation({
    mutationFn: () => api(`${path}/${item.id}/approve`, { method: 'POST' }),
    onSuccess: () => done({ kind: 'success', title: 'Contenu validé', text: item.title }),
    onError: (e) => onNotice(errorNotice(e, 'Validation impossible')),
  });
  const reject = useMutation({
    mutationFn: () => api(`${path}/${item.id}/reject`, { method: 'POST', body: { note: note.trim() } }),
    onSuccess: () => done({ kind: 'success', title: 'Contenu refusé', text: 'Le motif est visible par l’organisation.' }),
    onError: (e) => onNotice(errorNotice(e, 'Refus impossible')),
  });
  if (!canReview || !item.organization) return null;

  function submitRefusal(e: FormEvent) {
    e.preventDefault();
    if (note.trim().length < 5) { setError('Expliquez le refus en quelques mots (5 caractères au moins).'); return; }
    setError(undefined);
    reject.mutate();
  }

  return (
    <div style={{ marginTop: 'var(--space-3)' }}>
      {!refusing && (
        <div className="row">
          {item.reviewStatus !== 'APPROVED' && <Button loading={approve.isPending} onClick={() => approve.mutate()} aria-label={`Valider « ${item.title} »`}>Valider</Button>}
          {item.reviewStatus !== 'REJECTED' && <Button variant="secondary" onClick={() => setRefusing(true)} aria-label={`Refuser « ${item.title} »`}>Refuser</Button>}
        </div>
      )}
      {refusing && (
        <form onSubmit={submitRefusal} noValidate aria-label={`Refuser « ${item.title} »`}>
          <TextAreaField label="Motif du refus" required rows={3} value={note} onChange={(e) => setNote(e.target.value)} error={error} hint="L’organisation verra ce message." />
          <div className="row">
            <Button type="submit" variant="danger" loading={reject.isPending}>Confirmer le refus</Button>
            <Button variant="secondary" onClick={() => { setRefusing(false); setError(undefined); }}>Annuler</Button>
          </div>
        </form>
      )}
    </div>
  );
}

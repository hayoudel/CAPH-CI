import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { Paginated, Report } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { formatDate, REPORT_TYPE_LABELS } from '../../lib/format';
import { useListParams } from '../../lib/useListParams';
import { usePageTitle } from '../../lib/usePageTitle';
import { Alert } from '../../ui/Alert';
import { Attachments } from '../../ui/Attachments';
import { Button, LinkButton } from '../../ui/Button';
import { Checkbox, SelectField, TextAreaField, TextField } from '../../ui/Field';
import { errorNotice, Flash, type Notice } from '../../ui/Flash';
import { Pager } from '../../ui/Pager';
import { Spinner } from '../../ui/Spinner';

export const SUMMARY_MAX = 600;
const STATUS_FILTERS: Record<string, string> = { RECEIVED: 'Reçus', IN_PROCESS: 'En traitement', PROCESSED: 'Traités', CORRECTION_REQUESTED: 'Correction demandée' };
const statusBadge = (s: string) => (s === 'PROCESSED' ? 'badge badge--green' : s === 'CORRECTION_REQUESTED' ? 'badge badge--orange' : 'badge badge--grey');

export interface ReportValues { type: string; title: string; summary: string; periodStart: string; periodEnd: string; certify: boolean }
export const emptyReport: ReportValues = { type: '', title: '', summary: '', periodStart: '', periodEnd: '', certify: false };

/** Mêmes règles que le serveur : on prévient avant l'envoi, le serveur reste l'arbitre final. */
export function validateReport(v: ReportValues, creating: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.type) e.type = 'Choisissez le type de rapport.';
  if (v.title.trim().length < 3) e.title = 'Le titre doit contenir au moins 3 caractères.';
  else if (v.title.trim().length > 200) e.title = 'Le titre ne peut pas dépasser 200 caractères.';
  const s = v.summary.trim().length;
  if (s < 10) e.summary = 'Le résumé doit contenir au moins 10 caractères.';
  else if (s > SUMMARY_MAX) e.summary = `Le résumé ne peut pas dépasser ${SUMMARY_MAX} caractères (${s} actuellement).`;
  if (v.periodStart && v.periodEnd && v.periodEnd < v.periodStart) e.periodEnd = 'La fin de la période ne peut pas précéder son début.';
  if (creating && !v.certify) e.certify = 'Vous devez certifier être habilité(e) à transmettre ce rapport.';
  return e;
}

function ReportForm({ initial, creating, busy, onSubmit, onCancel }: {
  initial: ReportValues; creating: boolean; busy: boolean;
  onSubmit: (v: ReportValues) => void; onCancel: () => void;
}) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof ReportValues>(k: K, val: ReportValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const len = v.summary.trim().length;
  function submit(ev: FormEvent) {
    ev.preventDefault();
    const e = validateReport(v, creating);
    setErrors(e);
    if (Object.keys(e).length) { setTimeout(() => document.getElementById('form-errors')?.focus(), 0); return; }
    onSubmit(v);
  }
  return (
    <form onSubmit={submit} noValidate className="stack">
      {Object.keys(errors).length > 0 && (
        <div id="form-errors" tabIndex={-1}>
          <Alert kind="error" title="Le formulaire contient des erreurs">
            <ul>{Object.values(errors).map((m) => <li key={m}>{m}</li>)}</ul>
          </Alert>
        </div>
      )}
      <SelectField label="Type de rapport" required value={v.type} placeholder="Choisir…" error={errors.type}
        options={Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => ({ value, label }))} onChange={(e) => set('type', e.target.value)} />
      <TextField label="Titre" required value={v.title} error={errors.title} onChange={(e) => set('title', e.target.value)} />
      <TextAreaField label="Résumé" required value={v.summary} error={errors.summary} onChange={(e) => set('summary', e.target.value)}
        hint={<span className={`counter${len > SUMMARY_MAX ? ' counter--over' : ''}`}>{len} caractère{len > 1 ? 's' : ''} sur {SUMMARY_MAX} au maximum</span>} />
      <div className="form-grid">
        <TextField label="Début de la période" type="date" value={v.periodStart} onChange={(e) => set('periodStart', e.target.value)} />
        <TextField label="Fin de la période" type="date" value={v.periodEnd} error={errors.periodEnd} onChange={(e) => set('periodEnd', e.target.value)} />
      </div>
      {creating && (
        <div>
          <Checkbox label="Je certifie être habilité(e) à transmettre ce rapport au nom de mon organisation." checked={v.certify} onChange={(e) => set('certify', e.target.checked)} aria-describedby={errors.certify ? 'certify-err' : undefined} aria-invalid={errors.certify ? true : undefined} />
          {errors.certify && <p className="field__error" id="certify-err">{errors.certify}</p>}
        </div>
      )}
      <div className="row">
        <Button type="submit" loading={busy}>{creating ? 'Transmettre le rapport' : 'Enregistrer les modifications'}</Button>
        <Button variant="secondary" onClick={onCancel}>Annuler</Button>
      </div>
    </form>
  );
}

const payload = (v: ReportValues, creating: boolean) => ({
  type: v.type, title: v.title.trim(), summary: v.summary.trim(),
  ...(v.periodStart ? { periodStart: v.periodStart } : {}), ...(v.periodEnd ? { periodEnd: v.periodEnd } : {}),
  ...(creating ? { certifyAuthority: true } : {}),
});

export function ReportsPage() {
  usePageTitle('Rapports');
  const { can } = useAuth();
  const f = useListParams();
  const query = { status: f.get('status') || undefined, page: f.page, limit: 10 };
  const list = useQuery({ queryKey: ['reports', query], queryFn: () => api<Paginated<Report>>('/reports', { query }), placeholderData: (p) => p });
  const total = list.data?.meta.total ?? 0;
  return (
    <>
      <header className="page-head">
        <h1>Rapports</h1>
        <p>Les rapports que votre organisation a transmis à la CAPH-CI et leur état de traitement.</p>
      </header>
      <div className="stack">
        {can('report.create') && <div><LinkButton to="/espace/rapports/nouveau">Transmettre un rapport</LinkButton></div>}
        <div className="panel">
          <div className="filters">
            <SelectField label="État" value={f.get('status')} placeholder="Tous les états"
              options={Object.entries(STATUS_FILTERS).map(([value, label]) => ({ value, label }))} onChange={(e) => f.set('status', e.target.value)} />
          </div>
        </div>
        <div aria-live="polite">
          {list.isLoading && <Spinner />}
          {list.isError && <Alert kind="error" title="Chargement impossible">{list.error.message}</Alert>}
          {list.data && <p><strong>{total}</strong> {total > 1 ? 'rapports' : 'rapport'}</p>}
        </div>
        {list.data && total === 0 && <p className="empty">{f.get('status') ? 'Aucun rapport dans cet état.' : 'Vous n’avez pas encore transmis de rapport.'}</p>}
        {list.data && total > 0 && (
          <ul className="stack-list">
            {list.data.data.map((r) => (
              <li key={r.id}>
                <article className="panel">
                  <h2 className="panel__title"><Link to={`/espace/rapports/${r.id}`}>{r.title}</Link></h2>
                  <p className="item__meta">
                    <span className="badge badge--grey">{REPORT_TYPE_LABELS[r.type]}</span>{' '}
                    <span className={statusBadge(r.status)}>{r.statusLabel}</span>{' '}
                    Transmis le {formatDate(r.submittedAt)} par {r.author}
                  </p>
                  {r.status === 'CORRECTION_REQUESTED' && <p style={{ margin: 0 }}><strong>La CAPH-CI vous demande de corriger ce rapport.</strong></p>}
                </article>
              </li>
            ))}
          </ul>
        )}
        <Pager page={f.page} pages={list.data?.meta.totalPages ?? 1} onPage={(p) => f.set('page', String(p))} />
      </div>
    </>
  );
}

export function ReportNewPage() {
  usePageTitle('Transmettre un rapport');
  const navigate = useNavigate();
  const [notice, setNotice] = useState<Notice | null>(null);
  const m = useMutation({
    mutationFn: (v: ReportValues) => api<Report>('/reports', { method: 'POST', body: payload(v, true) }),
    onSuccess: (r) => navigate(`/espace/rapports/${r.id}`, { state: { flash: 'created' } }),
    onError: (e) => setNotice(errorNotice(e, 'Transmission impossible')),
  });
  return (
    <div className="stack">
      <p><Link to="/espace/rapports">← Retour aux rapports</Link></p>
      <header className="page-head">
        <h1>Transmettre un rapport</h1>
        <p>Remplissez les informations ci-dessous. Vous pourrez joindre des fichiers juste après.</p>
      </header>
      <Flash notice={notice} />
      <section className="panel">
        <ReportForm initial={emptyReport} creating busy={m.isPending} onSubmit={(v) => { setNotice(null); m.mutate(v); }} onCancel={() => navigate('/espace/rapports')} />
      </section>
    </div>
  );
}

export function ReportDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const location = useLocation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(
    (location.state as { flash?: string } | null)?.flash === 'created'
      ? { kind: 'success', title: 'Rapport transmis à la CAPH-CI', text: 'Vous pouvez maintenant joindre des fichiers (5 maximum).' } : null);
  const key = ['report', id];
  const q = useQuery({ queryKey: key, queryFn: () => api<Report>(`/reports/${id}`), retry: false });
  usePageTitle(q.data?.title ?? 'Rapport');
  const m = useMutation({
    mutationFn: (v: ReportValues) => api<Report>(`/reports/${id}`, { method: 'PATCH', body: payload(v, false) }),
    onSuccess: (r) => {
      qc.setQueryData(key, r); void qc.invalidateQueries({ queryKey: ['reports'] }); setEditing(false);
      setNotice({ kind: 'success', title: 'Modifications enregistrées', text: q.data?.status === 'CORRECTION_REQUESTED' ? 'Le rapport a été renvoyé à la CAPH-CI.' : undefined });
    },
    onError: (e) => setNotice(errorNotice(e, 'Enregistrement impossible')),
  });

  if (q.isLoading) return <Spinner />;
  if (q.isError || !q.data) {
    return (
      <div className="stack">
        <h1>Rapport introuvable</h1>
        <p>{q.error instanceof ApiError && q.error.status === 404 ? 'Ce rapport n’existe pas ou n’appartient pas à votre organisation.' : 'Le rapport n’a pas pu être chargé.'}</p>
        <p><Link to="/espace/rapports">Retour aux rapports</Link></p>
      </div>
    );
  }
  const r = q.data;
  const mayEdit = r.canEdit && can('report.create');
  const initial: ReportValues = { type: r.type, title: r.title, summary: r.summary, periodStart: r.periodStart?.slice(0, 10) ?? '', periodEnd: r.periodEnd?.slice(0, 10) ?? '', certify: true };
  return (
    <div className="stack">
      <p><Link to="/espace/rapports">← Retour aux rapports</Link></p>
      <header className="page-head">
        <h1>{r.title}</h1>
        <p><span className="badge badge--grey">{REPORT_TYPE_LABELS[r.type]}</span> <span className={statusBadge(r.status)}>{r.statusLabel}</span></p>
      </header>
      <Flash notice={notice} />
      {r.status === 'CORRECTION_REQUESTED' && (
        <Alert kind="error" title="La CAPH-CI demande une correction">
          {r.reviewerNote ?? 'Merci de corriger ce rapport.'} {mayEdit && 'Modifiez le rapport : il sera renvoyé automatiquement à l’enregistrement.'}
        </Alert>
      )}
      {r.status === 'PROCESSED' && <Alert kind="success" title="Rapport traité">La CAPH-CI a traité ce rapport{r.processedAt ? ` le ${formatDate(r.processedAt)}` : ''}.{r.reviewerNote ? ` ${r.reviewerNote}` : ''}</Alert>}
      {r.status === 'IN_PROCESS' && <Alert kind="info" title="Rapport en cours de traitement">Il ne peut plus être modifié.</Alert>}

      {editing ? (
        <section className="panel" aria-labelledby="edit">
          <h2 id="edit" className="panel__title">Modifier le rapport</h2>
          <ReportForm initial={initial} creating={false} busy={m.isPending} onSubmit={(v) => { setNotice(null); m.mutate(v); }} onCancel={() => setEditing(false)} />
        </section>
      ) : (
        <section className="panel" aria-labelledby="infos">
          <h2 id="infos" className="panel__title">Informations</h2>
          <dl className="dl">
            <dt>Transmis le</dt><dd>{formatDate(r.submittedAt)} par {r.author}</dd>
            {(r.periodStart || r.periodEnd) && <><dt>Période</dt><dd>{r.periodStart ? `du ${formatDate(r.periodStart)}` : ''} {r.periodEnd ? `au ${formatDate(r.periodEnd)}` : ''}</dd></>}
            <dt>Résumé</dt><dd className="prose">{r.summary}</dd>
          </dl>
          {mayEdit && <Button variant="secondary" onClick={() => { setNotice(null); setEditing(true); }}>Modifier le rapport</Button>}
        </section>
      )}
      <Attachments basePath={`/reports/${r.id}`} queryKey={key} items={r.attachments} editable={mayEdit} />
    </div>
  );
}

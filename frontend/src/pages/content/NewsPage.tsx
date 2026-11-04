import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { NewsCategory, NewsProposal, Paginated } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { formatDate } from '../../lib/format';
import { useListParams } from '../../lib/useListParams';
import { usePageTitle } from '../../lib/usePageTitle';
import { Alert } from '../../ui/Alert';
import { Attachments } from '../../ui/Attachments';
import { Button, LinkButton } from '../../ui/Button';
import { SelectField, TextAreaField, TextField } from '../../ui/Field';
import { errorNotice, Flash, type Notice } from '../../ui/Flash';
import { Pager } from '../../ui/Pager';
import { Spinner } from '../../ui/Spinner';

export const DESCRIPTION_MAX = 5000;
const STATUS_FILTERS: Record<string, string> = { SUBMITTED: 'Soumises', CORRECTION: 'Correction demandée', APPROVED: 'Approuvées', REJECTED: 'Refusées', PUBLISHED: 'Publiées' };
const statusBadge = (s: string) => (s === 'PUBLISHED' || s === 'APPROVED' ? 'badge badge--green' : s === 'CORRECTION' || s === 'REJECTED' ? 'badge badge--orange' : 'badge badge--grey');

export interface NewsValues { categoryId: string; title: string; description: string }
export const emptyNews: NewsValues = { categoryId: '', title: '', description: '' };

export function validateNews(v: NewsValues): Record<string, string> {
  const e: Record<string, string> = {};
  const t = v.title.trim().length;
  if (t < 5) e.title = 'Le titre doit contenir au moins 5 caractères.';
  else if (t > 200) e.title = 'Le titre ne peut pas dépasser 200 caractères.';
  const d = v.description.trim().length;
  if (d < 20) e.description = 'Le texte doit contenir au moins 20 caractères.';
  else if (d > DESCRIPTION_MAX) e.description = `Le texte ne peut pas dépasser ${DESCRIPTION_MAX} caractères (${d} actuellement).`;
  return e;
}

function NewsForm({ initial, categories, creating, busy, onSubmit, onCancel }: {
  initial: NewsValues; categories: NewsCategory[]; creating: boolean; busy: boolean; onSubmit: (v: NewsValues) => void; onCancel: () => void;
}) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof NewsValues>(k: K, val: NewsValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const len = v.description.trim().length;
  function submit(ev: FormEvent) {
    ev.preventDefault();
    const e = validateNews(v);
    setErrors(e);
    if (Object.keys(e).length) { setTimeout(() => document.getElementById('form-errors')?.focus(), 0); return; }
    onSubmit(v);
  }
  return (
    <form onSubmit={submit} noValidate className="stack">
      {Object.keys(errors).length > 0 && (
        <div id="form-errors" tabIndex={-1}>
          <Alert kind="error" title="Le formulaire contient des erreurs"><ul>{Object.values(errors).map((m) => <li key={m}>{m}</li>)}</ul></Alert>
        </div>
      )}
      <TextField label="Titre" required value={v.title} error={errors.title} onChange={(e) => set('title', e.target.value)} />
      <SelectField label="Catégorie" value={v.categoryId} placeholder="Sans catégorie" options={categories.map((c) => ({ value: c.id, label: c.label }))} onChange={(e) => set('categoryId', e.target.value)} />
      <TextAreaField label="Texte de l’actualité" required rows={10} value={v.description} error={errors.description} onChange={(e) => set('description', e.target.value)}
        hint={<span className={`counter${len > DESCRIPTION_MAX ? ' counter--over' : ''}`}>{len} caractère{len > 1 ? 's' : ''} sur {DESCRIPTION_MAX} au maximum</span>} />
      <div className="row">
        <Button type="submit" loading={busy}>{creating ? 'Proposer cette actualité' : 'Enregistrer les modifications'}</Button>
        <Button variant="secondary" onClick={onCancel}>Annuler</Button>
      </div>
    </form>
  );
}

const payload = (v: NewsValues) => ({ title: v.title.trim(), description: v.description.trim(), ...(v.categoryId ? { categoryId: v.categoryId } : {}) });
const useCategories = () => useQuery({ queryKey: ['news-categories'], queryFn: () => api<NewsCategory[]>('/news/categories'), staleTime: 3_600_000 });

export function NewsListPage() {
  usePageTitle('Mes actualités');
  const { can } = useAuth();
  const f = useListParams();
  const query = { status: f.get('status') || undefined, page: f.page, limit: 10 };
  const list = useQuery({ queryKey: ['news', query], queryFn: () => api<Paginated<NewsProposal>>('/news', { query }), placeholderData: (p) => p });
  const total = list.data?.meta.total ?? 0;
  return (
    <>
      <header className="page-head">
        <h1>Mes actualités</h1>
        <p>Proposez une actualité de votre organisation. L’équipe de la CAPH-CI la relit avant de la publier.</p>
      </header>
      <div className="stack">
        {can('news.propose') && <div><LinkButton to="/espace/actualites/nouvelle">Proposer une actualité</LinkButton></div>}
        <div className="panel">
          <div className="filters">
            <SelectField label="État" value={f.get('status')} placeholder="Tous les états"
              options={Object.entries(STATUS_FILTERS).map(([value, label]) => ({ value, label }))} onChange={(e) => f.set('status', e.target.value)} />
          </div>
        </div>
        <div aria-live="polite">
          {list.isLoading && <Spinner />}
          {list.isError && <Alert kind="error" title="Chargement impossible">{list.error.message}</Alert>}
          {list.data && <p><strong>{total}</strong> {total > 1 ? 'propositions' : 'proposition'}</p>}
        </div>
        {list.data && total === 0 && <p className="empty">{f.get('status') ? 'Aucune proposition dans cet état.' : 'Vous n’avez pas encore proposé d’actualité.'}</p>}
        {list.data && total > 0 && (
          <ul className="stack-list">
            {list.data.data.map((n) => (
              <li key={n.id}>
                <article className="panel">
                  <h2 className="panel__title"><Link to={`/espace/actualites/${n.id}`}>{n.title}</Link></h2>
                  <p className="item__meta">
                    <span className={statusBadge(n.status)}>{n.statusLabel}</span>{' '}
                    {n.category && <><span className="badge badge--grey">{n.category.label}</span>{' '}</>}
                    Proposée le {formatDate(n.submittedAt)} par {n.author}
                  </p>
                  {n.status === 'CORRECTION' && <p style={{ margin: 0 }}><strong>La CAPH-CI vous demande de corriger cette proposition.</strong></p>}
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

export function NewsNewPage() {
  usePageTitle('Proposer une actualité');
  const navigate = useNavigate();
  const cats = useCategories();
  const [notice, setNotice] = useState<Notice | null>(null);
  const m = useMutation({
    mutationFn: (v: NewsValues) => api<NewsProposal>('/news', { method: 'POST', body: payload(v) }),
    onSuccess: (n) => navigate(`/espace/actualites/${n.id}`, { state: { flash: 'created' } }),
    onError: (e) => setNotice(errorNotice(e, 'Envoi impossible')),
  });
  return (
    <div className="stack">
      <p><Link to="/espace/actualites">← Retour à mes actualités</Link></p>
      <header className="page-head">
        <h1>Proposer une actualité</h1>
        <p>Racontez ce qui s’est passé dans votre organisation. Vous pourrez joindre des photos ou documents juste après.</p>
      </header>
      <Flash notice={notice} />
      <section className="panel">
        <NewsForm initial={emptyNews} categories={cats.data ?? []} creating busy={m.isPending} onSubmit={(v) => { setNotice(null); m.mutate(v); }} onCancel={() => navigate('/espace/actualites')} />
      </section>
    </div>
  );
}

export function NewsDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const location = useLocation();
  const qc = useQueryClient();
  const cats = useCategories();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(
    (location.state as { flash?: string } | null)?.flash === 'created'
      ? { kind: 'success', title: 'Actualité proposée à la CAPH-CI', text: 'Vous pouvez maintenant joindre des fichiers (5 maximum).' } : null);
  const key = ['news-item', id];
  const q = useQuery({ queryKey: key, queryFn: () => api<NewsProposal>(`/news/${id}`), retry: false });
  usePageTitle(q.data?.title ?? 'Actualité');
  const m = useMutation({
    mutationFn: (v: NewsValues) => api<NewsProposal>(`/news/${id}`, { method: 'PATCH', body: payload(v) }),
    onSuccess: (n) => {
      const wasCorrection = q.data?.status === 'CORRECTION';
      qc.setQueryData(key, n); void qc.invalidateQueries({ queryKey: ['news'] }); setEditing(false);
      setNotice({ kind: 'success', title: 'Modifications enregistrées', text: wasCorrection ? 'La proposition a été renvoyée à la CAPH-CI.' : undefined });
    },
    onError: (e) => setNotice(errorNotice(e, 'Enregistrement impossible')),
  });

  if (q.isLoading) return <Spinner />;
  if (q.isError || !q.data) {
    return (
      <div className="stack">
        <h1>Proposition introuvable</h1>
        <p>{q.error instanceof ApiError && q.error.status === 404 ? 'Cette proposition n’existe pas ou n’appartient pas à votre organisation.' : 'La proposition n’a pas pu être chargée.'}</p>
        <p><Link to="/espace/actualites">Retour à mes actualités</Link></p>
      </div>
    );
  }
  const n = q.data;
  const mayEdit = n.canEdit && can('news.propose');
  return (
    <div className="stack">
      <p><Link to="/espace/actualites">← Retour à mes actualités</Link></p>
      <header className="page-head">
        <h1>{n.title}</h1>
        <p><span className={statusBadge(n.status)}>{n.statusLabel}</span>{n.category && <> <span className="badge badge--grey">{n.category.label}</span></>}</p>
      </header>
      <Flash notice={notice} />
      {n.status === 'CORRECTION' && (
        <Alert kind="error" title="La CAPH-CI demande une correction">
          {n.reviewerNote ?? 'Merci de corriger cette proposition.'} {mayEdit && 'Modifiez-la : elle sera renvoyée automatiquement à l’enregistrement.'}
        </Alert>
      )}
      {n.status === 'REJECTED' && <Alert kind="error" title="Proposition refusée">{n.reviewerNote ?? 'La CAPH-CI n’a pas retenu cette proposition.'}</Alert>}
      {n.status === 'APPROVED' && <Alert kind="success" title="Proposition approuvée">Elle sera publiée prochainement par la CAPH-CI.</Alert>}
      {n.status === 'PUBLISHED' && <Alert kind="success" title="Actualité publiée">Cette actualité a été publiée par la CAPH-CI.</Alert>}

      {editing ? (
        <section className="panel" aria-labelledby="edit">
          <h2 id="edit" className="panel__title">Modifier la proposition</h2>
          <NewsForm initial={{ categoryId: n.category?.id ?? '', title: n.title, description: n.description }} categories={cats.data ?? []} creating={false}
            busy={m.isPending} onSubmit={(v) => { setNotice(null); m.mutate(v); }} onCancel={() => setEditing(false)} />
        </section>
      ) : (
        <section className="panel" aria-labelledby="txt">
          <h2 id="txt" className="panel__title">Texte proposé</h2>
          <p className="item__meta">Proposée le {formatDate(n.submittedAt)} par {n.author}</p>
          <p className="prose">{n.description}</p>
          {mayEdit && <p style={{ marginBottom: 0 }}><Button variant="secondary" onClick={() => { setNotice(null); setEditing(true); }}>Modifier la proposition</Button></p>}
        </section>
      )}
      <Attachments basePath={`/news/${n.id}`} queryKey={key} items={n.attachments} editable={mayEdit} />
    </div>
  );
}

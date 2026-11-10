import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { NewsCategory, NewsProposal, Paginated } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { mayModify } from '../../lib/ownership';
import { decisionBadge, formatDate, NEWS_STATUSES } from '../../lib/format';
import { useListParams } from '../../lib/useListParams';
import { usePageTitle } from '../../lib/usePageTitle';
import { Alert } from '../../ui/Alert';
import { NewFilesPicker, noFiles, uploadNewFiles, type NewFiles } from '../../ui/NewFiles';
import { Attachments } from '../../ui/Attachments';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { ConfirmDelete, ItemActions } from '../../ui/ConfirmDelete';
import { SelectField, TextAreaField, TextField } from '../../ui/Field';
import { errorNotice, Flash, type Notice } from '../../ui/Flash';
import { History } from '../../ui/History';
import { Pager } from '../../ui/Pager';
import { Spinner } from '../../ui/Spinner';
import { DemoBadge } from '../../ui/DemoBadge';

export const DESCRIPTION_MAX = 5000;
export const SUMMARY_MAX = 300;

export interface NewsValues { categoryId: string; title: string; summary: string; description: string; newsDate: string }
export const emptyNews: NewsValues = { categoryId: '', title: '', summary: '', description: '', newsDate: '' };

/** `submitting` = soumission à la validation (tout est exigé) ; sinon brouillon (seul le titre est obligatoire). */
export function validateNews(v: NewsValues, submitting = true): Record<string, string> {
  const e: Record<string, string> = {};
  const t = v.title.trim().length;
  if (t < 5) e.title = 'Le titre doit contenir au moins 5 caractères.';
  else if (t > 200) e.title = 'Le titre ne peut pas dépasser 200 caractères.';
  const s = (v.summary ?? '').trim().length;
  if (s > SUMMARY_MAX) e.summary = `Le résumé ne peut pas dépasser ${SUMMARY_MAX} caractères (${s} actuellement).`;
  else if (submitting && s < 10) e.summary = 'Le résumé doit contenir au moins 10 caractères.';
  const d = v.description.trim().length;
  if (d > DESCRIPTION_MAX) e.description = `Le contenu ne peut pas dépasser ${DESCRIPTION_MAX} caractères (${d} actuellement).`;
  else if (submitting && d < 20) e.description = 'Le contenu doit contenir au moins 20 caractères.';
  return e;
}

export type Intent = 'draft' | 'submit';
type Mode = 'new' | 'draft' | 'submitted' | 'correction';

function NewsForm({ initial, categories, mode, busy, onSave, onCancel }: {
  initial: NewsValues; categories: NewsCategory[]; mode: Mode; busy: Intent | null; onSave: (v: NewsValues, intent: Intent, files: NewFiles) => void; onCancel: () => void;
}) {
  const { user } = useAuth();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<NewFiles>(noFiles);
  const set = <K extends keyof NewsValues>(k: K, val: NewsValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const sLen = v.summary.trim().length, dLen = v.description.trim().length;
  const withFiles = mode === 'new';
  const canDraft = mode === 'new' || mode === 'draft';

  function go(intent: Intent) {
    const e = validateNews(v, intent === 'submit');
    setErrors(e);
    if (Object.keys(e).length) { setTimeout(() => document.getElementById('form-errors')?.focus(), 0); return; }
    onSave(v, intent, files);
  }
  const submitLabel = mode === 'correction' ? 'Enregistrer et renvoyer à la validation' : mode === 'submitted' ? 'Enregistrer les modifications' : 'Soumettre à la validation';
  return (
    <form onSubmit={(ev: FormEvent) => { ev.preventDefault(); go('submit'); }} noValidate className="stack">
      {Object.keys(errors).length > 0 && (
        <div id="form-errors" tabIndex={-1}>
          <Alert kind="error" title="Le formulaire contient des erreurs"><ul>{Object.values(errors).map((m) => <li key={m}>{m}</li>)}</ul></Alert>
        </div>
      )}
      <TextField label="Titre de l’actualité" required value={v.title} error={errors.title} onChange={(e) => set('title', e.target.value)} />
      <div className="grid-2">
        <SelectField label="Catégorie" value={v.categoryId} placeholder="Sans catégorie" options={categories.map((c) => ({ value: c.id, label: c.label }))} onChange={(e) => set('categoryId', e.target.value)} />
        <TextField label="Date de l’événement ou de l’actualité" type="date" value={v.newsDate} onChange={(e) => set('newsDate', e.target.value)} hint="Facultatif." />
      </div>
      <TextField label="Organisation à l’origine de la proposition" value={user?.organizationName ?? ''} readOnly hint="Renseignée automatiquement." />
      <TextAreaField label="Résumé" required rows={3} value={v.summary} error={errors.summary} onChange={(e) => set('summary', e.target.value)}
        hint={<span className={`counter${sLen > SUMMARY_MAX ? ' counter--over' : ''}`}>Deux ou trois phrases. {sLen} sur {SUMMARY_MAX} caractères au maximum.</span>} />
      <TextAreaField label="Contenu complet" required rows={10} value={v.description} error={errors.description} onChange={(e) => set('description', e.target.value)}
        hint={<span className={`counter${dLen > DESCRIPTION_MAX ? ' counter--over' : ''}`}>{dLen} caractère{dLen > 1 ? 's' : ''} sur {DESCRIPTION_MAX} au maximum</span>} />

      {withFiles && <NewFilesPicker files={files} onChange={setFiles} />}

      <div className="form-actions">
        {canDraft && <Button variant="secondary" loading={busy === 'draft'} disabled={busy !== null} onClick={() => go('draft')}>Enregistrer comme brouillon</Button>}
        <Button type="submit" loading={busy === 'submit'} disabled={busy !== null && busy !== 'submit'}>{submitLabel}</Button>
        <Button variant="ghost" onClick={onCancel}>Annuler</Button>
      </div>
    </form>
  );
}

const payload = (v: NewsValues) => ({
  title: v.title.trim(), description: v.description.trim(), ...(v.summary.trim() ? { summary: v.summary.trim() } : {}),
  ...(v.categoryId ? { categoryId: v.categoryId } : {}), ...(v.newsDate ? { newsDate: v.newsDate } : {}),
});
const useCategories = () => useQuery({ queryKey: ['news-categories'], queryFn: () => api<NewsCategory[]>('/news/categories'), staleTime: 3_600_000 });

export function NewsListPage() {
  usePageTitle('Mes actualités');
  const { can, user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<NewsProposal | null>(null);
  const [deleting, setDeleting] = useState<NewsProposal | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const f = useListParams();
  const query = { status: f.get('status') || undefined, page: f.page, limit: 10 };
  const list = useQuery({ queryKey: ['news', query], queryFn: () => api<Paginated<NewsProposal>>('/news', { query }), placeholderData: (p) => p });
  const total = list.data?.meta.total ?? 0;
  return (
    <>
      <header className="page-head page-head--actions">
        <div>
          <h1>Mes actualités</h1>
          <p>Proposez une actualité de votre organisation et suivez son traitement. L’équipe de la CAPH-CI la valide avant publication.</p>
        </div>
        {can('news.propose') && <div className="page-head__actions"><Button onClick={() => setAdding(true)}>+ Proposer une actualité</Button></div>}
      </header>
      <Flash notice={notice} />
      {adding && <NewsCreateModal onClose={() => setAdding(false)} onDone={(n) => { setAdding(false); setNotice(n); }} />}
      {editing && <NewsEditModal news={editing} onClose={() => setEditing(null)} onDone={(n) => { setEditing(null); setNotice(n); }} />}
      {deleting && <ConfirmDelete what="Actualité" title={deleting.title} path={`/news/${deleting.id}`} invalidate={['news']} onClose={() => setDeleting(null)} onDone={(n) => { setDeleting(null); setNotice(n); }} />}
      <div className="stack">
        <div className="panel">
          <div className="filters">
            <SelectField label="État" value={f.get('status')} placeholder="Tous les états"
              options={Object.entries(NEWS_STATUSES).map(([value, label]) => ({ value, label }))} onChange={(e) => f.set('status', e.target.value)} />
          </div>
        </div>
        <div aria-live="polite">
          {list.isLoading && <Spinner />}
          {list.isError && <Alert kind="error" title="Chargement impossible">{list.error.message}</Alert>}
          {list.data && <p><strong>{total}</strong> {total > 1 ? 'propositions' : 'proposition'}</p>}
        </div>
        {list.data && total === 0 && <p className="empty">{f.get('status') ? 'Aucune proposition dans cet état.' : 'Vous n’avez pas encore proposé d’actualité. Utilisez « + Proposer une actualité » pour commencer.'}</p>}
        {list.data && total > 0 && (
          <ul className="stack-list">
            {list.data.data.map((n) => (
              <li key={n.id}>
                <article className="panel">
                  <h2 className="panel__title"><Link to={`/espace/actualites/${n.id}`}>{n.title}</Link></h2>
                  <DemoBadge show={n.isDemo} />
                  <p className="item__meta">
                    <span className={decisionBadge(n.status)}>{n.statusLabel}</span>{' '}
                    {n.category && <><span className="badge badge--grey">{n.category.label}</span>{' '}</>}
                    {n.submittedAt ? `Soumise le ${formatDate(n.submittedAt)}` : `Brouillon modifié le ${formatDate(n.updatedAt)}`} · Réf. {n.reference}
                  </p>
                  {n.summary && <p style={{ margin: 0 }}>{n.summary}</p>}
                  {n.status === 'CORRECTION' && <p style={{ margin: 0 }}><strong>La CAPH-CI vous demande de corriger cette proposition.</strong></p>}
                  {n.status === 'DRAFT' && <p style={{ margin: 0 }}><strong>Brouillon non envoyé :</strong> terminez-le puis soumettez-le à la validation.</p>}
                  {n.canEdit && can('news.propose') && mayModify(user, n.authorId) && <ItemActions title={n.title} onEdit={() => { setNotice(null); setEditing(n); }} onDelete={() => { setNotice(null); setDeleting(n); }} />}
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

/** Fenêtre « Proposer une actualité » : même formulaire que la page dédiée ; après envoi, elle se ferme et la liste se rafraîchit. */
function NewsCreateModal({ onClose, onDone }: { onClose: () => void; onDone: (n: Notice) => void }) {
  const qc = useQueryClient();
  const cats = useCategories();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<Intent | null>(null);
  async function save(v: NewsValues, intent: Intent, files: NewFiles) {
    setNotice(null); setBusy(intent);
    let created: NewsProposal;
    try { created = await api<NewsProposal>('/news', { method: 'POST', body: { ...payload(v), submit: intent === 'submit' } }); }
    catch (e) { setNotice(errorNotice(e, 'Envoi impossible')); setBusy(null); return; }
    const failed = await uploadNewFiles(`/news/${created.id}`, files);
    void qc.invalidateQueries({ queryKey: ['news'] }); void qc.invalidateQueries({ queryKey: ['dashboard'] });
    const f = FLASHES[intent === 'submit' ? 'submitted' : 'draft'];
    onDone({ kind: 'success', title: f.title, text: failed.length ? `${f.text} Ces fichiers n’ont pas pu être envoyés : ${failed.join(', ')}. Ajoutez-les depuis la page de l’actualité.` : f.text });
  }
  return (
    <Modal title="Proposer une actualité" size="lg" onClose={onClose}>
      <p className="muted">Enregistrez un brouillon pour continuer plus tard, ou soumettez directement à la validation de la CAPH-CI.</p>
      <Flash notice={notice} />
      <NewsForm initial={emptyNews} categories={cats.data ?? []} mode="new" busy={busy} onSave={(v, i, f) => void save(v, i, f)} onCancel={onClose} />
    </Modal>
  );
}

/** Fenêtre « Modifier la proposition » : brouillon, déjà soumise ou à corriger. */
function NewsEditModal({ news, onClose, onDone }: { news: NewsProposal; onClose: () => void; onDone: (n: Notice) => void }) {
  const qc = useQueryClient();
  const cats = useCategories();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<Intent | null>(null);
  const mode: Mode = news.status === 'DRAFT' ? 'draft' : news.status === 'CORRECTION' ? 'correction' : 'submitted';
  async function save(v: NewsValues, intent: Intent) {
    setNotice(null); setBusy(intent);
    try {
      await api<NewsProposal>(`/news/${news.id}`, { method: 'PATCH', body: payload(v) });
      if (news.status === 'DRAFT' && intent === 'submit') await api<NewsProposal>(`/news/${news.id}/submit`, { method: 'POST' });
      void qc.invalidateQueries({ queryKey: ['news'] }); void qc.invalidateQueries({ queryKey: ['dashboard'] });
      onDone(news.status === 'DRAFT' && intent === 'draft' ? { kind: 'success', ...FLASHES.draft }
        : news.status === 'DRAFT' || news.status === 'CORRECTION' ? { kind: 'success', title: 'Actualité soumise à la validation', text: 'Votre proposition a été envoyée à la CAPH-CI.' }
        : { kind: 'success', title: 'Modifications enregistrées' });
    } catch (e) { setNotice(errorNotice(e, 'Enregistrement impossible')); setBusy(null); }
  }
  const initial: NewsValues = { categoryId: news.category?.id ?? '', title: news.title, summary: news.summary ?? '', description: news.description, newsDate: news.newsDate ? news.newsDate.slice(0, 10) : '' };
  return (
    <Modal title="Modifier la proposition" size="lg" onClose={onClose}>
      <Flash notice={notice} />
      <NewsForm initial={initial} categories={cats.data ?? []} mode={mode} busy={busy} onSave={(v, i) => void save(v, i)} onCancel={onClose} />
    </Modal>
  );
}

export function NewsNewPage() {
  usePageTitle('Proposer une actualité');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cats = useCategories();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<Intent | null>(null);

  async function save(v: NewsValues, intent: Intent, files: NewFiles) {
    setNotice(null); setBusy(intent);
    let created: NewsProposal;
    try {
      created = await api<NewsProposal>('/news', { method: 'POST', body: { ...payload(v), submit: intent === 'submit' } });
    } catch (e) { setNotice(errorNotice(e, 'Envoi impossible')); setBusy(null); return; }
    // L'actualité existe : on ajoute les fichiers ; un échec n'annule rien, il est signalé sur la page suivante.
    const failed = await uploadNewFiles(`/news/${created.id}`, files);
    void qc.invalidateQueries({ queryKey: ['news'] }); void qc.invalidateQueries({ queryKey: ['dashboard'] });
    navigate(`/espace/actualites/${created.id}`, { state: { flash: intent === 'submit' ? 'submitted' : 'draft', failed } });
  }
  return (
    <div className="stack">
      <header className="page-head">
        <h1>Proposer une actualité</h1>
        <p>Tout se remplit sur cette page. Enregistrez un brouillon pour continuer plus tard, ou soumettez directement à la validation de la CAPH-CI.</p>
      </header>
      <Flash notice={notice} />
      <section className="panel">
        <NewsForm initial={emptyNews} categories={cats.data ?? []} mode="new" busy={busy} onSave={(v, i, f) => void save(v, i, f)} onCancel={() => navigate('/espace/actualites')} />
      </section>
    </div>
  );
}

const FLASHES = {
  submitted: { title: 'Actualité soumise à la validation', text: 'La CAPH-CI va l’examiner. Vous serez informé de sa décision ici et par courriel.' },
  draft: { title: 'Brouillon enregistré', text: 'Rien n’a été envoyé à la CAPH-CI. Complétez-le puis soumettez-le quand il est prêt.' },
} as const;

export function NewsDetailPage() {
  const { id } = useParams();
  const { can, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cats = useCategories();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<Intent | 'delete' | null>(null);
  const st = location.state as { flash?: keyof typeof FLASHES; failed?: string[] } | null;
  const [notice, setNotice] = useState<Notice | null>(st?.flash ? { kind: 'success', ...FLASHES[st.flash] } : null);
  const key = ['news-item', id];
  const q = useQuery({ queryKey: key, queryFn: () => api<NewsProposal>(`/news/${id}`), retry: false });
  usePageTitle(q.data?.title ?? 'Actualité');
  const refresh = (n: NewsProposal) => { qc.setQueryData(key, n); void qc.invalidateQueries({ queryKey: ['news'] }); void qc.invalidateQueries({ queryKey: ['dashboard'] }); };

  async function save(v: NewsValues, intent: Intent) {
    const was = q.data?.status;
    setNotice(null); setBusy(intent);
    try {
      let n = await api<NewsProposal>(`/news/${id}`, { method: 'PATCH', body: payload(v) });
      if (was === 'DRAFT' && intent === 'submit') n = await api<NewsProposal>(`/news/${id}/submit`, { method: 'POST' });
      refresh(n); setEditing(false);
      setNotice(was === 'DRAFT' && intent === 'draft' ? { kind: 'success', ...FLASHES.draft }
        : was === 'DRAFT' || was === 'CORRECTION' ? { kind: 'success', title: 'Actualité soumise à la validation', text: 'Votre proposition a été envoyée à la CAPH-CI.' }
        : { kind: 'success', title: 'Modifications enregistrées' });
    } catch (e) { setNotice(errorNotice(e, 'Enregistrement impossible')); } finally { setBusy(null); }
  }
  async function submitDraft() {
    setNotice(null); setBusy('submit');
    try { refresh(await api<NewsProposal>(`/news/${id}/submit`, { method: 'POST' })); setNotice({ kind: 'success', title: 'Actualité soumise à la validation', text: 'La CAPH-CI va l’examiner.' }); }
    catch (e) { setNotice(errorNotice(e, 'Soumission impossible')); } finally { setBusy(null); }
  }
  async function deleteDraft() {
    setBusy('delete');
    try { await api(`/news/${id}`, { method: 'DELETE' }); void qc.invalidateQueries({ queryKey: ['news'] }); navigate('/espace/actualites'); }
    catch (e) { setNotice(errorNotice(e, 'Suppression impossible')); setBusy(null); setConfirmDelete(false); }
  }

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
  const mayEdit = n.canEdit && can('news.propose') && mayModify(user, n.authorId);
  const mode: Mode = n.status === 'DRAFT' ? 'draft' : n.status === 'CORRECTION' ? 'correction' : 'submitted';
  return (
    <div className="stack">
      <header className="page-head">
        <h1>{n.title}</h1>
        <DemoBadge show={n.isDemo} />
        <p><span className={decisionBadge(n.status)}>{n.statusLabel}</span>{n.category && <> <span className="badge badge--grey">{n.category.label}</span></>}</p>
        <p className="item__meta">Référence {n.reference}{n.submittedAt && <> · Soumise le {formatDate(n.submittedAt)}</>} · {n.organization.name}</p>
      </header>
      <Flash notice={notice} />
      {st?.failed && st.failed.length > 0 && (
        <Alert kind="error" title="Certains fichiers n’ont pas pu être envoyés">{st.failed.join(', ')}. Ajoutez-les de nouveau depuis cette page.</Alert>
      )}
      {n.status === 'DRAFT' && <Alert kind="info" title="Brouillon">Cette actualité n’a pas été envoyée à la CAPH-CI. Soumettez-la quand elle est prête.</Alert>}
      {n.status === 'SUBMITTED' && <Alert kind="info" title="Proposition reçue">La CAPH-CI n’a pas encore commencé l’examen. Vous pouvez encore la modifier.</Alert>}
      {n.status === 'IN_REVIEW' && <Alert kind="info" title="Validation en cours">La CAPH-CI examine votre proposition.</Alert>}
      {n.status === 'CORRECTION' && (
        <Alert kind="error" title="La CAPH-CI demande une correction">
          {n.reviewerNote ?? 'Merci de corriger cette proposition.'} {mayEdit && 'Modifiez-la : elle sera renvoyée à la validation à l’enregistrement.'}
        </Alert>
      )}
      {n.status === 'REJECTED' && <Alert kind="error" title="Proposition refusée">{n.reviewerNote ?? 'La CAPH-CI n’a pas retenu cette proposition.'}</Alert>}
      {n.status === 'APPROVED' && <Alert kind="success" title="Proposition validée">{n.reviewerNote ? `${n.reviewerNote} ` : ''}Elle sera publiée prochainement par la CAPH-CI.</Alert>}
      {n.status === 'PUBLISHED' && <Alert kind="success" title="Actualité publiée">Cette actualité a été publiée par la CAPH-CI.</Alert>}

      {editing ? (
        <section className="panel" aria-labelledby="edit">
          <h2 id="edit" className="panel__title">Modifier la proposition</h2>
          <NewsForm initial={{ categoryId: n.category?.id ?? '', title: n.title, summary: n.summary ?? '', description: n.description, newsDate: n.newsDate ? n.newsDate.slice(0, 10) : '' }}
            categories={cats.data ?? []} mode={mode} busy={busy === 'draft' || busy === 'submit' ? busy : null}
            onSave={(v, i) => void save(v, i)} onCancel={() => setEditing(false)} />
        </section>
      ) : (
        <section className="panel" aria-labelledby="txt">
          <h2 id="txt" className="panel__title">Contenu proposé</h2>
          {n.newsDate && <p className="item__meta">Date de l’actualité : {formatDate(n.newsDate)}</p>}
          {n.summary && <p><strong>{n.summary}</strong></p>}
          <p className="prose">{n.description || 'Aucun contenu pour le moment.'}</p>
          {mayEdit && (
            <div className="form-actions" style={{ marginTop: 'var(--space-4)' }}>
              {n.status === 'DRAFT' && <Button loading={busy === 'submit'} onClick={() => void submitDraft()}>Soumettre à la validation</Button>}
              <Button variant="secondary" onClick={() => { setNotice(null); setEditing(true); }}>Modifier la proposition</Button>
              {!confirmDelete && <Button variant="ghost" onClick={() => setConfirmDelete(true)}>{n.status === 'DRAFT' ? 'Supprimer ce brouillon' : 'Supprimer cette proposition'}</Button>}
              {confirmDelete && (
                <>
                  <Button variant="danger" loading={busy === 'delete'} onClick={() => void deleteDraft()}>Confirmer la suppression</Button>
                  <Button variant="ghost" onClick={() => setConfirmDelete(false)}>{n.status === 'DRAFT' ? 'Garder le brouillon' : 'Garder la proposition'}</Button>
                </>
              )}
            </div>
          )}
        </section>
      )}
      <Attachments basePath={`/news/${n.id}`} queryKey={key} items={n.attachments} editable={mayEdit} />
      <History entries={n.history} />
      <p><Link to="/espace/actualites">Retour à mes actualités</Link></p>
    </div>
  );
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { Paginated, Project } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { decisionBadge, formatDate, formatXof, PROJECT_FILTERS } from '../../lib/format';
import { useListParams } from '../../lib/useListParams';
import { usePageTitle } from '../../lib/usePageTitle';
import { Alert } from '../../ui/Alert';
import { Attachments } from '../../ui/Attachments';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { TextAreaField, TextField } from '../../ui/Field';
import { errorNotice, Flash, type Notice } from '../../ui/Flash';
import { History } from '../../ui/History';
import { NewFilesPicker, noFiles, uploadNewFiles, type NewFiles } from '../../ui/NewFiles';
import { Pager } from '../../ui/Pager';
import { Spinner } from '../../ui/Spinner';
import { DemoBadge } from '../../ui/DemoBadge';

export interface ProjectValues {
  title: string; context: string; objectives: string; description: string; beneficiaries: string; zone: string;
  startDate: string; endDate: string; budget: string; partners: string; expectedResults: string;
}
export const emptyProject: ProjectValues = {
  title: '', context: '', objectives: '', description: '', beneficiaries: '', zone: '', startDate: '', endDate: '', budget: '', partners: '', expectedResults: '',
};
const LIMITS: Partial<Record<keyof ProjectValues, [number, string]>> = {
  context: [3000, 'Le contexte'], objectives: [3000, 'Les objectifs'], description: [6000, 'La description'], beneficiaries: [1500, 'Les bénéficiaires'],
  zone: [300, 'La zone d’intervention'], partners: [1500, 'Les partenaires'], expectedResults: [3000, 'Les résultats attendus'],
};

/** `submitting` = soumission à la validation (champs essentiels exigés) ; sinon brouillon (seul le nom est obligatoire). */
export function validateProject(v: ProjectValues, submitting = true): Record<string, string> {
  const e: Record<string, string> = {};
  const t = v.title.trim().length;
  if (t < 5) e.title = 'Le nom du projet doit contenir au moins 5 caractères.';
  else if (t > 200) e.title = 'Le nom du projet ne peut pas dépasser 200 caractères.';
  for (const [k, [max, label]] of Object.entries(LIMITS) as [keyof ProjectValues, [number, string]][]) {
    if (v[k].trim().length > max) e[k] = `${label} ne peut pas dépasser ${max} caractères.`;
  }
  if (submitting) {
    if (v.description.trim().length < 20) e.description = 'La description détaillée doit contenir au moins 20 caractères.';
    if (!v.objectives.trim()) e.objectives = 'Indiquez les objectifs du projet.';
    if (!v.zone.trim()) e.zone = 'Indiquez la zone d’intervention.';
    if (!v.startDate) e.startDate = 'Indiquez la date de début.';
  }
  if (v.startDate && v.endDate && v.endDate < v.startDate) e.endDate = 'La date de fin doit être postérieure à la date de début.';
  if (v.budget.trim() && !/^\d{1,11}$/.test(v.budget.trim())) e.budget = 'Le budget doit être un nombre entier de francs CFA, sans espace ni lettre.';
  return e;
}

const payload = (v: ProjectValues) => {
  const o: Record<string, unknown> = { title: v.title.trim(), description: v.description.trim() };
  for (const k of ['context', 'objectives', 'beneficiaries', 'zone', 'partners', 'expectedResults'] as const) if (v[k].trim()) o[k] = v[k].trim();
  if (v.startDate) o.startDate = v.startDate;
  if (v.endDate) o.endDate = v.endDate;
  if (v.budget.trim()) o.budgetXof = Number(v.budget.trim());
  return o;
};
const toValues = (p: Project): ProjectValues => ({
  title: p.title, context: p.context ?? '', objectives: p.objectives ?? '', description: p.description, beneficiaries: p.beneficiaries ?? '', zone: p.zone ?? '',
  startDate: p.startDate?.slice(0, 10) ?? '', endDate: p.endDate?.slice(0, 10) ?? '', budget: p.budgetXof != null ? String(p.budgetXof) : '', partners: p.partners ?? '', expectedResults: p.expectedResults ?? '',
});
type Intent = 'draft' | 'submit';

function ProjectForm({ initial, creating, toComplete = false, busy, onSave, onCancel }: {
  initial: ProjectValues; creating: boolean; toComplete?: boolean; busy: Intent | null; onSave: (v: ProjectValues, i: Intent, f: NewFiles) => void; onCancel: () => void;
}) {
  const { user } = useAuth();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<NewFiles>(noFiles);
  const set = <K extends keyof ProjectValues>(k: K, val: string) => setV((p) => ({ ...p, [k]: val }));
  function go(intent: Intent) {
    const e = validateProject(v, intent === 'submit');
    setErrors(e);
    if (Object.keys(e).length) { setTimeout(() => document.getElementById('form-errors')?.focus(), 0); return; }
    onSave(v, intent, files);
  }
  const area = (k: keyof ProjectValues, label: string, rows = 4, required = false, hint?: string) =>
    <TextAreaField label={label} rows={rows} required={required} value={v[k]} error={errors[k]} hint={hint} onChange={(e) => set(k, e.target.value)} />;
  return (
    <form onSubmit={(ev: FormEvent) => { ev.preventDefault(); go('submit'); }} noValidate className="stack">
      {Object.keys(errors).length > 0 && (
        <div id="form-errors" tabIndex={-1}>
          <Alert kind="error" title="Le formulaire contient des erreurs"><ul>{Object.values(errors).map((m) => <li key={m}>{m}</li>)}</ul></Alert>
        </div>
      )}
      <TextField label="Nom du projet" required value={v.title} error={errors.title} onChange={(e) => set('title', e.target.value)} />
      <TextField label="Organisation porteuse" value={user?.organizationName ?? ''} readOnly hint="Renseignée automatiquement." />
      {area('context', 'Contexte et justification', 4, false, 'Pourquoi ce projet est-il nécessaire ?')}
      {area('objectives', 'Objectifs du projet', 4, true)}
      {area('description', 'Description détaillée', 8, true, 'Activités prévues, méthode, calendrier général.')}
      {area('beneficiaries', 'Bénéficiaires ciblés', 3)}
      <TextField label="Zone d’intervention" required value={v.zone} error={errors.zone} onChange={(e) => set('zone', e.target.value)} hint="Ville, commune, région…" />
      <div className="grid-2">
        <TextField label="Date de début" type="date" required value={v.startDate} error={errors.startDate} onChange={(e) => set('startDate', e.target.value)} />
        <TextField label="Date de fin prévisionnelle" type="date" value={v.endDate} error={errors.endDate} onChange={(e) => set('endDate', e.target.value)} />
      </div>
      <TextField label="Budget estimatif (F CFA)" inputMode="numeric" value={v.budget} error={errors.budget} onChange={(e) => set('budget', e.target.value)} hint="Facultatif. Un nombre entier, par exemple 3500000. Non visible par les autres organisations." />
      {area('partners', 'Partenaires éventuels', 3)}
      {area('expectedResults', 'Résultats attendus', 4)}
      {creating && <NewFilesPicker files={files} onChange={setFiles} label="Documents complémentaires (facultatif)" />}
      <div className="form-actions">
        <Button variant="secondary" loading={busy === 'draft'} disabled={busy !== null} onClick={() => go('draft')}>{toComplete ? 'Enregistrer sans envoyer' : 'Enregistrer comme brouillon'}</Button>
        <Button type="submit" loading={busy === 'submit'} disabled={busy === 'draft'}>{toComplete ? 'Renvoyer à la validation' : 'Soumettre à la validation'}</Button>
        <Button variant="ghost" onClick={onCancel}>Annuler</Button>
      </div>
    </form>
  );
}

function Period({ p }: { p: Project }) {
  if (!p.startDate) return <>Dates à préciser</>;
  return <>{formatDate(p.startDate)}{p.endDate ? ` → ${formatDate(p.endDate)}` : ''}</>;
}

function ProjectCard({ p, showProgress }: { p: Project; showProgress: boolean }) {
  return (
    <article className="panel project-card">
      <h2 className="panel__title"><Link to={`/espace/projets/${p.id}`}>{p.title}</Link></h2>
      <DemoBadge show={p.isDemo} />
      <p className="project-card__meta">{p.organization.name}{p.isMine && ' (vous)'}</p>
      <p className="project-card__body">{p.description}</p>
      <p className="project-card__meta">{p.zone ? `${p.zone} · ` : ''}<Period p={p} /></p>
      {showProgress && p.progress !== null && (
        <div>
          <div className="progress" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement"><span style={{ width: `${p.progress}%` }} /></div>
          <p className="project-card__meta">Avancement : {p.progress} % (renseigné par la CAPH-CI)</p>
        </div>
      )}
      {showProgress && p.results && <p className="project-card__meta"><strong>Réalisations :</strong> {p.results}</p>}
      <div className="project-card__foot">
        <span className={decisionBadge(p.status)}>{p.statusLabel}</span>
        <Link to={`/espace/projets/${p.id}`} className="btn btn--secondary btn--sm">Voir le détail</Link>
      </div>
    </article>
  );
}

/** Fenêtre « Proposer un projet » : même formulaire que la page dédiée ; après envoi, elle se ferme et la liste se rafraîchit. */
function ProjectCreateModal({ onClose, onDone }: { onClose: () => void; onDone: (n: Notice) => void }) {
  const qc = useQueryClient();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<Intent | null>(null);
  async function save(v: ProjectValues, intent: Intent, files: NewFiles) {
    setNotice(null); setBusy(intent);
    let created: Project;
    try { created = await api<Project>('/projects', { method: 'POST', body: { ...payload(v), submit: intent === 'submit' } }); }
    catch (e) { setNotice(errorNotice(e, 'Envoi impossible')); setBusy(null); return; }
    const failed = await uploadNewFiles(`/projects/${created.id}`, files);
    void qc.invalidateQueries({ queryKey: ['projects'] }); void qc.invalidateQueries({ queryKey: ['dashboard'] });
    const f = FLASHES[intent === 'submit' ? 'submitted' : 'draft'];
    onDone({ kind: 'success', title: f.title, text: failed.length ? `${f.text} Ces fichiers n’ont pas pu être envoyés : ${failed.join(', ')}. Ajoutez-les depuis la page du projet.` : f.text });
  }
  return (
    <Modal title="Proposer un projet" size="lg" onClose={onClose}>
      <p className="muted">Enregistrez un brouillon pour continuer plus tard, ou soumettez-le à la validation de la CAPH-CI : il n’est jamais validé automatiquement.</p>
      <Flash notice={notice} />
      <ProjectForm initial={emptyProject} creating busy={busy} onSave={(v, i, f) => void save(v, i, f)} onCancel={onClose} />
    </Modal>
  );
}

export function ProjectsPage() {
  usePageTitle('Projets');
  const { can } = useAuth();
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const f = useListParams();
  const filter = f.get('filter') || 'ALL';
  const [search, setSearch] = useState(f.get('q'));
  const query = { filter, q: f.get('q') || undefined, page: f.page, limit: 12 };
  const list = useQuery({ queryKey: ['projects', query], queryFn: () => api<Paginated<Project>>('/projects', { query }), placeholderData: (p) => p });
  const total = list.data?.meta.total ?? 0;
  const empty: Record<string, string> = {
    ALL: 'Aucun projet pour le moment.', ONGOING: 'Aucun projet en cours pour le moment.', COMPLETED: 'Aucun projet terminé pour le moment.',
    PENDING: 'Vous n’avez aucun projet en attente de validation.', MINE: 'Votre organisation n’a pas encore de projet.',
  };
  return (
    <>
      <header className="page-head page-head--actions">
        <div>
          <h1>Projets</h1>
          <p>Consultez les projets des organisations et suivez ceux de la vôtre. Chaque nouveau projet est validé par la CAPH-CI avant d’être partagé.</p>
        </div>
        {can('project.propose') && <div className="page-head__actions"><Button onClick={() => setAdding(true)}>+ Proposer un projet</Button></div>}
      </header>
      <Flash notice={notice} />
      {adding && <ProjectCreateModal onClose={() => setAdding(false)} onDone={(n) => { setAdding(false); setNotice(n); }} />}
      <div className="stack">
        <ul className="chips" aria-label="Filtrer les projets">
          {Object.entries(PROJECT_FILTERS).map(([value, label]) => (
            <li key={value}><button type="button" className="chip" aria-pressed={filter === value} onClick={() => f.set('filter', value === 'ALL' ? '' : value)}>{label}</button></li>
          ))}
        </ul>
        <form className="panel" role="search" onSubmit={(e) => { e.preventDefault(); f.set('q', search.trim()); }}>
          <div className="filters filters--search">
            <TextField label="Rechercher un projet" type="search" placeholder="Nom, zone ou organisation" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div><Button type="submit" variant="secondary">Rechercher</Button></div>
          </div>
        </form>
        {filter === 'ONGOING' && <p className="item__meta">Projets validés et actuellement en cours. L’avancement n’est affiché que lorsque la CAPH-CI l’a renseigné.</p>}
        <div aria-live="polite">
          {list.isLoading && <Spinner />}
          {list.isError && <Alert kind="error" title="Chargement impossible">{list.error.message}</Alert>}
          {list.data && <p><strong>{total}</strong> {total > 1 ? 'projets' : 'projet'}</p>}
        </div>
        {list.data && total === 0 && <p className="empty">{f.get('q') ? 'Aucun projet ne correspond à cette recherche.' : empty[filter]}</p>}
        {list.data && total > 0 && (
          <ul className="card-grid">
            {list.data.data.map((p) => <li key={p.id}><ProjectCard p={p} showProgress={filter === 'ONGOING' || p.status === 'ONGOING'} /></li>)}
          </ul>
        )}
        <Pager page={f.page} pages={list.data?.meta.totalPages ?? 1} onPage={(p) => f.set('page', String(p))} />
      </div>
    </>
  );
}

export function ProjectNewPage() {
  usePageTitle('Proposer un projet');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<Intent | null>(null);
  async function save(v: ProjectValues, intent: Intent, files: NewFiles) {
    setNotice(null); setBusy(intent);
    let created: Project;
    try { created = await api<Project>('/projects', { method: 'POST', body: { ...payload(v), submit: intent === 'submit' } }); }
    catch (e) { setNotice(errorNotice(e, 'Envoi impossible')); setBusy(null); return; }
    const failed = await uploadNewFiles(`/projects/${created.id}`, files);
    void qc.invalidateQueries({ queryKey: ['projects'] }); void qc.invalidateQueries({ queryKey: ['dashboard'] });
    navigate(`/espace/projets/${created.id}`, { state: { flash: intent === 'submit' ? 'submitted' : 'draft', failed } });
  }
  return (
    <div className="stack">
      <header className="page-head">
        <h1>Proposer un projet</h1>
        <p>Décrivez votre projet. Enregistrez un brouillon pour continuer plus tard, ou soumettez-le à la validation de la CAPH-CI : il n’est jamais validé automatiquement.</p>
      </header>
      <Flash notice={notice} />
      <section className="panel"><ProjectForm initial={emptyProject} creating busy={busy} onSave={(v, i, f) => void save(v, i, f)} onCancel={() => navigate('/espace/projets')} /></section>
    </div>
  );
}

const FLASHES = {
  submitted: { title: 'Projet soumis à la validation', text: 'La CAPH-CI va l’examiner. Vous verrez sa décision et ses observations sur cette page.' },
  draft: { title: 'Brouillon enregistré', text: 'Rien n’a été envoyé à la CAPH-CI. Complétez-le puis soumettez-le quand il est prêt.' },
} as const;

function Fact({ label, children }: { label: string; children: React.ReactNode }) { return <><dt>{label}</dt><dd>{children}</dd></>; }
function Block({ title, text }: { title: string; text: string | null }) {
  return text ? <><h3>{title}</h3><p className="prose">{text}</p></> : null;
}

export function ProjectDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<Intent | 'delete' | null>(null);
  const st = location.state as { flash?: keyof typeof FLASHES; failed?: string[] } | null;
  const [notice, setNotice] = useState<Notice | null>(st?.flash ? { kind: 'success', ...FLASHES[st.flash] } : null);
  const key = ['project', id];
  const q = useQuery({ queryKey: key, queryFn: () => api<Project>(`/projects/${id}`), retry: false });
  usePageTitle(q.data?.title ?? 'Projet');
  const refresh = (p: Project) => { qc.setQueryData(key, p); void qc.invalidateQueries({ queryKey: ['projects'] }); void qc.invalidateQueries({ queryKey: ['dashboard'] }); };

  async function save(v: ProjectValues, intent: Intent) {
    const was = q.data?.status;
    setNotice(null); setBusy(intent);
    try {
      let p = await api<Project>(`/projects/${id}`, { method: 'PATCH', body: payload(v) });
      if (intent === 'submit') p = await api<Project>(`/projects/${id}/submit`, { method: 'POST' });
      refresh(p); setEditing(false);
      setNotice(intent === 'draft' ? { kind: 'success', ...FLASHES.draft } : { kind: 'success', ...FLASHES.submitted, title: was === 'TO_COMPLETE' ? 'Projet complété et renvoyé à la validation' : FLASHES.submitted.title });
    } catch (e) { setNotice(errorNotice(e, 'Enregistrement impossible')); } finally { setBusy(null); }
  }
  async function submitNow() {
    setNotice(null); setBusy('submit');
    try { refresh(await api<Project>(`/projects/${id}/submit`, { method: 'POST' })); setNotice({ kind: 'success', ...FLASHES.submitted }); }
    catch (e) { setNotice(errorNotice(e, 'Soumission impossible')); } finally { setBusy(null); }
  }
  async function deleteDraft() {
    setBusy('delete');
    try { await api(`/projects/${id}`, { method: 'DELETE' }); void qc.invalidateQueries({ queryKey: ['projects'] }); navigate('/espace/projets'); }
    catch (e) { setNotice(errorNotice(e, 'Suppression impossible')); setBusy(null); setConfirmDelete(false); }
  }

  if (q.isLoading) return <Spinner />;
  if (q.isError || !q.data) {
    return (
      <div className="stack">
        <h1>Projet introuvable</h1>
        <p>{q.error instanceof ApiError && q.error.status === 404 ? 'Ce projet n’existe pas ou n’est pas encore partagé.' : 'Le projet n’a pas pu être chargé.'}</p>
        <p><Link to="/espace/projets">Retour aux projets</Link></p>
      </div>
    );
  }
  const p = q.data;
  const mayEdit = p.canEdit && can('project.propose');
  return (
    <div className="stack">
      <header className="page-head">
        <h1>{p.title}</h1>
        <DemoBadge show={p.isDemo} />
        <p><span className={decisionBadge(p.status)}>{p.statusLabel}</span> <span className="item__meta">{p.organization.name}</span></p>
        <p className="item__meta">Référence {p.reference}{p.submittedAt && <> · Soumis le {formatDate(p.submittedAt)}</>}</p>
      </header>
      <Flash notice={notice} />
      {st?.failed && st.failed.length > 0 && <Alert kind="error" title="Certains fichiers n’ont pas pu être envoyés">{st.failed.join(', ')}. Ajoutez-les de nouveau depuis cette page.</Alert>}
      {p.isMine && p.status === 'DRAFT' && <Alert kind="info" title="Brouillon">Ce projet n’a pas été envoyé à la CAPH-CI. Soumettez-le quand il est prêt.</Alert>}
      {p.isMine && p.status === 'SUBMITTED' && <Alert kind="info" title="Projet reçu">La CAPH-CI n’a pas encore commencé l’examen.</Alert>}
      {p.isMine && p.status === 'IN_REVIEW' && <Alert kind="info" title="Validation en cours">La CAPH-CI examine votre projet.</Alert>}
      {p.isMine && p.status === 'TO_COMPLETE' && <Alert kind="error" title="La CAPH-CI demande des compléments">{p.reviewerNote ?? 'Merci de compléter ce projet.'} Modifiez-le puis soumettez-le de nouveau.</Alert>}
      {p.isMine && p.status === 'REJECTED' && <Alert kind="error" title="Projet refusé">{p.reviewerNote ?? 'La CAPH-CI n’a pas retenu ce projet.'}</Alert>}
      {p.isMine && ['VALIDATED', 'ONGOING', 'COMPLETED'].includes(p.status) && p.reviewerNote && <Alert kind="success" title={`Projet « ${p.statusLabel.toLowerCase()} »`}>{p.reviewerNote}</Alert>}

      {editing ? (
        <section className="panel" aria-labelledby="edit">
          <h2 id="edit" className="panel__title">Modifier le projet</h2>
          <ProjectForm initial={toValues(p)} creating={false} toComplete={p.status === 'TO_COMPLETE'} busy={busy === 'draft' || busy === 'submit' ? busy : null} onSave={(v, i) => void save(v, i)} onCancel={() => setEditing(false)} />
        </section>
      ) : (
        <>
          <section className="panel" aria-labelledby="info">
            <h2 id="info" className="panel__title">Présentation</h2>
            <dl className="facts">
              <Fact label="Zone d’intervention">{p.zone ?? 'À préciser'}</Fact>
              <Fact label="Période"><Period p={p} /></Fact>
              {p.budgetXof != null && <Fact label="Budget estimatif">{formatXof(p.budgetXof)}</Fact>}
              {p.progress !== null && <Fact label="Avancement (renseigné par la CAPH-CI)">{p.progress} %</Fact>}
            </dl>
            <p className="prose">{p.description}</p>
            <Block title="Contexte et justification" text={p.context} />
            <Block title="Objectifs" text={p.objectives} />
            <Block title="Bénéficiaires ciblés" text={p.beneficiaries} />
            <Block title="Partenaires" text={p.partners} />
            <Block title="Résultats attendus" text={p.expectedResults} />
            <Block title="Résultats et réalisations constatés" text={p.results} />
            {mayEdit && (
              <div className="form-actions" style={{ marginTop: 'var(--space-4)' }}>
                <Button loading={busy === 'submit'} onClick={() => void submitNow()}>Soumettre à la validation</Button>
                <Button variant="secondary" onClick={() => { setNotice(null); setEditing(true); }}>Modifier le projet</Button>
                {p.status === 'DRAFT' && !confirmDelete && <Button variant="ghost" onClick={() => setConfirmDelete(true)}>Supprimer ce brouillon</Button>}
                {p.status === 'DRAFT' && confirmDelete && (
                  <>
                    <Button variant="danger" loading={busy === 'delete'} onClick={() => void deleteDraft()}>Confirmer la suppression</Button>
                    <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Garder le brouillon</Button>
                  </>
                )}
              </div>
            )}
          </section>
        </>
      )}
      {p.isMine && <Attachments basePath={`/projects/${p.id}`} queryKey={key} items={p.attachments} editable={mayEdit} />}
      {p.isMine && <History entries={p.history} />}
      <p><Link to="/espace/projets">Retour aux projets</Link></p>
    </div>
  );
}

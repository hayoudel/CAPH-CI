import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import { DOCUMENT_CATEGORIES, EVENT_MODES, EVENT_TYPES, OPPORTUNITY_TYPES } from '../../lib/format';
import { Button } from '../../ui/Button';
import { Checkbox, SelectField, TextAreaField, TextField } from '../../ui/Field';
import { checkFile } from '../../ui/Attachments';
import { errorNotice, Flash, type Notice } from '../../ui/Flash';
import { Modal } from '../../ui/Modal';
import type { AgendaEvent, LibraryDocument, Opportunity } from '../../api/types';

const toOptions = (r: Record<string, string>) => Object.entries(r).map(([value, label]) => ({ value, label }));
type Errors = Record<string, string>;

/** Erreurs renvoyées par le serveur, rattachées au bon champ quand il est connu. */
function serverErrors(e: unknown): { fields: Errors; notice: Notice } {
  const fields: Errors = {};
  if (e instanceof ApiError) for (const f of e.fieldErrors) fields[f.field] = f.message;
  return { fields, notice: errorNotice(e, 'Enregistrement impossible') };
}

function Footer({ pending, label, onCancel }: { pending: boolean; label: string; onCancel: () => void }) {
  return (
    <div className="form-actions">
      <Button type="submit" loading={pending}>{pending ? 'Enregistrement…' : label}</Button>
      <Button variant="secondary" onClick={onCancel}>Annuler</Button>
    </div>
  );
}

/** `proposer` : l'envoi vient d'une OPH (Président ou Suppléant) et devra être validé par la CAPH-CI ; sinon le personnel publie directement. */
interface Props { onClose: () => void; onDone: (n: Notice) => void; proposer?: boolean }

const WAIT_NOTE = 'Votre envoi sera visible par votre organisation tout de suite. Il le sera par les autres organisations et sur le site public après validation par la CAPH-CI.';
const sentNotice = (proposer: boolean | undefined, published: string, title: string): Notice =>
  proposer
    ? { kind: 'success', title: 'Envoi enregistré : en attente de validation', text: `« ${title} » sera publié après validation par la CAPH-CI.` }
    : { kind: 'success', title: published, text: title };

function ProposerNote({ proposer }: { proposer?: boolean }) {
  return proposer ? <p className="muted">{WAIT_NOTE}</p> : null;
}

/** Message de retour après une modification : une OPH qui modifie un contenu déjà jugé le renvoie à la validation. */
const editedNotice = (proposer: boolean | undefined, was: string | undefined, title: string, what: string): Notice =>
  proposer && was && was !== 'PENDING'
    ? { kind: 'success', title: 'Modification enregistrée : en attente de validation', text: `« ${title} » sera de nouveau examiné par la CAPH-CI avant d’être visible des autres organisations.` }
    : { kind: 'success', title: `${what} modifié`, text: title };

function EditWarning({ proposer, was, what }: { proposer?: boolean; was?: string; what: string }) {
  if (!proposer || !was || was === 'PENDING') return null;
  return <p className="muted">Ce contenu est déjà examiné par la CAPH-CI. Après votre modification, {what} repassera « en attente de validation » et ne sera plus visible des autres organisations jusqu’à la nouvelle validation.</p>;
}

/** Date ISO → valeur d'un champ « datetime-local » (heure locale). */
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/* ───────────── Document ───────────── */
export function AddDocumentModal({ onClose, onDone, proposer, edit }: Props & { edit?: LibraryDocument }) {
  const qc = useQueryClient();
  const fileId = useId();
  const [f, setF] = useState({ title: edit?.title ?? '', description: edit?.description ?? '', category: edit?.category ?? 'GUIDE', accessLevel: edit?.accessLevel ?? 'MEMBERS', isFeatured: edit?.isFeatured ?? false });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const set = (k: string, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  const create = useMutation({
    mutationFn: () => {
      if (edit) {
        return api(`/documents/${edit.id}`, { method: 'PATCH', body: {
          title: f.title.trim(), description: f.description.trim(), category: f.category,
          ...(proposer ? {} : { accessLevel: f.accessLevel, isFeatured: f.isFeatured }),
        } });
      }
      const body = new FormData();
      body.append('title', f.title.trim());
      if (f.description.trim()) body.append('description', f.description.trim());
      body.append('category', f.category);
      if (!proposer) { body.append('accessLevel', f.accessLevel); body.append('isFeatured', String(f.isFeatured)); }
      body.append('file', file!);
      return api('/documents', { method: 'POST', body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] }); qc.invalidateQueries({ queryKey: ['dashboard'] });
      onDone(edit ? editedNotice(proposer, undefined, f.title.trim(), 'Document') : { kind: 'success', title: 'Document publié', text: f.title.trim() }); // document interne : aucune validation
    },
    onError: (e) => { const s = serverErrors(e); setErrors(s.fields); setNotice(s.notice); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (f.title.trim().length < 3) next.title = 'Saisissez un titre d’au moins 3 caractères.';
    if (f.description.length > 1000) next.description = 'La description ne peut pas dépasser 1 000 caractères.';
    if (!edit) {
      if (!file) next.file = 'Choisissez le fichier à publier.';
      else { const p = checkFile(file); if (p) next.file = p; }
    }
    setErrors(next);
    if (Object.keys(next).length) { setNotice({ kind: 'error', title: 'Le formulaire contient des erreurs', text: 'Corrigez les champs signalés.' }); return; }
    setNotice(null);
    create.mutate();
  }

  return (
    <Modal title={edit ? 'Modifier le document' : 'Ajouter un document'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <Flash notice={notice} />
        <TextField label="Titre" required value={f.title} onChange={(e) => set('title', e.target.value)} error={errors.title} />
        <TextAreaField label="Description" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} error={errors.description} hint="Facultatif. 1 000 caractères au plus." />
        <div className="form-grid">
          <SelectField label="Catégorie" required value={f.category} options={toOptions(DOCUMENT_CATEGORIES)} onChange={(e) => set('category', e.target.value)} />
          {!proposer && (
            <SelectField label="Qui peut le consulter" value={f.accessLevel} onChange={(e) => set('accessLevel', e.target.value)}
              options={[{ value: 'MEMBERS', label: 'Tous les membres' }, { value: 'CONTRIBUTORS', label: 'Présidents et contributeurs seulement' }]} />
          )}
        </div>
        {!edit && <div className="field">
          <label className="field__label" htmlFor={fileId}>Fichier<span className="field__req" aria-hidden="true"> *</span><span className="sr-only"> (obligatoire)</span></label>
          <input id={fileId} className="file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            aria-invalid={errors.file ? true : undefined} aria-describedby={`${fileId}-h`} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="field__hint" id={`${fileId}-h`}>PDF, JPG ou PNG, 10 Mo au plus.</div>
          {errors.file && <p className="field__error">{errors.file}</p>}
        </div>}
        {!proposer && <Checkbox label="Mettre ce document à la une du tableau de bord" checked={f.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} />}
        <Footer pending={create.isPending} label={edit ? 'Enregistrer les modifications' : 'Publier le document'} onCancel={onClose} />
      </form>
    </Modal>
  );
}

/* ───────────── Opportunité ───────────── */
export function AddOpportunityModal({ onClose, onDone, proposer, edit }: Props & { edit?: Opportunity }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ type: edit?.type ?? 'CALL_FOR_PROJECTS', title: edit?.title ?? '', summary: edit?.summary ?? '', body: edit?.body ?? '', deadline: edit?.deadline?.slice(0, 10) ?? '', audience: edit?.audience ?? '', modality: edit?.modality ?? '', visibility: edit?.visibility ?? 'MEMBERS' });
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));

  const create = useMutation({
    mutationFn: () => api(edit ? `/opportunities/${edit.id}` : '/opportunities', {
      method: edit ? 'PATCH' : 'POST',
      body: {
        type: f.type, title: f.title.trim(), summary: f.summary.trim(), visibility: f.visibility,
        body: f.body.trim() || undefined, deadline: f.deadline || undefined,
        audience: f.audience.trim() || undefined, modality: f.modality.trim() || undefined,
      },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] }); qc.invalidateQueries({ queryKey: ['dashboard'] });
      onDone(edit ? editedNotice(proposer, edit.reviewStatus, f.title.trim(), 'Opportunité') : sentNotice(proposer, 'Opportunité publiée', f.title.trim()));
    },
    onError: (e) => { const s = serverErrors(e); setErrors(s.fields); setNotice(s.notice); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    const t = f.title.trim().length, s = f.summary.trim().length;
    if (t < 5 || t > 200) next.title = 'Le titre doit faire entre 5 et 200 caractères.';
    if (s < 10 || s > 500) next.summary = 'Le résumé doit faire entre 10 et 500 caractères.';
    if (f.body.length > 10000) next.body = 'Le détail ne peut pas dépasser 10 000 caractères.';
    setErrors(next);
    if (Object.keys(next).length) { setNotice({ kind: 'error', title: 'Le formulaire contient des erreurs', text: 'Corrigez les champs signalés.' }); return; }
    setNotice(null);
    create.mutate();
  }

  return (
    <Modal title={edit ? 'Modifier l’opportunité' : 'Ajouter une opportunité'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {edit ? <EditWarning proposer={proposer} was={edit.reviewStatus} what="elle" /> : <ProposerNote proposer={proposer} />}
        <Flash notice={notice} />
        <SelectField label="Type" required value={f.type} options={toOptions(OPPORTUNITY_TYPES)} onChange={(e) => set('type', e.target.value)} />
        <TextField label="Titre" required value={f.title} onChange={(e) => set('title', e.target.value)} error={errors.title} />
        <TextAreaField label="Résumé" required rows={3} value={f.summary} onChange={(e) => set('summary', e.target.value)} error={errors.summary} hint={`Affiché dans la liste. ${f.summary.trim().length} / 500`} />
        <TextAreaField label="Détails" rows={5} value={f.body} onChange={(e) => set('body', e.target.value)} error={errors.body} hint="Facultatif." />
        <div className="form-grid">
          <TextField label="Date limite" type="date" value={f.deadline} onChange={(e) => set('deadline', e.target.value)} error={errors.deadline} hint="Facultatif." />
          <SelectField label="Visibilité" value={f.visibility} onChange={(e) => set('visibility', e.target.value)}
            options={[{ value: 'MEMBERS', label: 'Réservée aux membres' }, { value: 'PUBLIC', label: proposer ? 'Proposée pour le site public (après validation)' : 'Visible sur le site public' }]} />
          <TextField label="Pour qui" value={f.audience} onChange={(e) => set('audience', e.target.value)} hint="Facultatif." />
          <TextField label="Comment candidater" value={f.modality} onChange={(e) => set('modality', e.target.value)} hint="Facultatif. Exemple : dépôt en ligne." />
        </div>
        <Footer pending={create.isPending} label={edit ? 'Enregistrer les modifications' : proposer ? 'Envoyer pour validation' : 'Publier l’opportunité'} onCancel={onClose} />
      </form>
    </Modal>
  );
}

/* ───────────── Événement ───────────── */
export function AddEventModal({ onClose, onDone, proposer, edit }: Props & { edit?: AgendaEvent }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ type: edit?.type ?? 'MEETING', title: edit?.title ?? '', description: edit?.description ?? '', startsAt: toLocalInput(edit?.startsAt), endsAt: toLocalInput(edit?.endsAt), mode: edit?.mode ?? 'ONSITE', location: edit?.location ?? '' });
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));

  const create = useMutation({
    mutationFn: () => api(edit ? `/events/${edit.id}` : '/events', {
      method: edit ? 'PATCH' : 'POST',
      body: {
        type: f.type, title: f.title.trim(), mode: f.mode,
        description: f.description.trim() || undefined, location: f.location.trim() || undefined,
        startsAt: new Date(f.startsAt).toISOString(), endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : undefined,
      },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] }); qc.invalidateQueries({ queryKey: ['dashboard'] });
      onDone(edit ? editedNotice(proposer, edit.reviewStatus, f.title.trim(), 'Événement') : sentNotice(proposer, 'Événement ajouté à l’agenda', f.title.trim()));
    },
    onError: (e) => { const s = serverErrors(e); setErrors(s.fields); setNotice(s.notice); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (f.title.trim().length < 3) next.title = 'Saisissez un titre d’au moins 3 caractères.';
    if (!f.startsAt) next.startsAt = 'Indiquez la date et l’heure de début.';
    if (f.endsAt && f.startsAt && new Date(f.endsAt) <= new Date(f.startsAt)) next.endsAt = 'La fin doit être après le début.';
    if (f.description.length > 5000) next.description = 'La description ne peut pas dépasser 5 000 caractères.';
    setErrors(next);
    if (Object.keys(next).length) { setNotice({ kind: 'error', title: 'Le formulaire contient des erreurs', text: 'Corrigez les champs signalés.' }); return; }
    setNotice(null);
    create.mutate();
  }

  return (
    <Modal title={edit ? 'Modifier l’événement' : 'Ajouter un événement'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {edit ? <EditWarning proposer={proposer} was={edit.reviewStatus} what="il" /> : <ProposerNote proposer={proposer} />}
        <Flash notice={notice} />
        <SelectField label="Type d’événement" required value={f.type} options={toOptions(EVENT_TYPES)} onChange={(e) => set('type', e.target.value)} />
        <TextField label="Titre" required value={f.title} onChange={(e) => set('title', e.target.value)} error={errors.title} />
        <TextAreaField label="Description" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} error={errors.description} hint="Facultatif." />
        <div className="form-grid">
          <TextField label="Début" type="datetime-local" required value={f.startsAt} onChange={(e) => set('startsAt', e.target.value)} error={errors.startsAt} />
          <TextField label="Fin" type="datetime-local" value={f.endsAt} onChange={(e) => set('endsAt', e.target.value)} error={errors.endsAt} hint="Facultatif." />
          <SelectField label="Format" value={f.mode} options={toOptions(EVENT_MODES)} onChange={(e) => set('mode', e.target.value)} />
          <TextField label="Lieu ou lien" value={f.location} onChange={(e) => set('location', e.target.value)} hint="Facultatif. Exemple : Abidjan Plateau." />
        </div>
        <Footer pending={create.isPending} label={edit ? 'Enregistrer les modifications' : proposer ? 'Envoyer pour validation' : 'Ajouter à l’agenda'} onCancel={onClose} />
      </form>
    </Modal>
  );
}

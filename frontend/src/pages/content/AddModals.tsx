import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import { DOCUMENT_CATEGORIES, EVENT_MODES, EVENT_TYPES, OPPORTUNITY_TYPES } from '../../lib/format';
import { Button } from '../../ui/Button';
import { Checkbox, SelectField, TextAreaField, TextField } from '../../ui/Field';
import { checkFile } from '../../ui/Attachments';
import { errorNotice, Flash, type Notice } from '../../ui/Flash';
import { Modal } from '../../ui/Modal';

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

/* ───────────── Document ───────────── */
export function AddDocumentModal({ onClose, onDone, proposer }: Props) {
  const qc = useQueryClient();
  const fileId = useId();
  const [f, setF] = useState({ title: '', description: '', category: 'GUIDE', accessLevel: 'MEMBERS', isFeatured: false });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const set = (k: string, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  const create = useMutation({
    mutationFn: () => {
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
      onDone({ kind: 'success', title: 'Document publié', text: f.title.trim() }); // document interne : aucune validation
    },
    onError: (e) => { const s = serverErrors(e); setErrors(s.fields); setNotice(s.notice); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (f.title.trim().length < 3) next.title = 'Saisissez un titre d’au moins 3 caractères.';
    if (f.description.length > 1000) next.description = 'La description ne peut pas dépasser 1 000 caractères.';
    if (!file) next.file = 'Choisissez le fichier à publier.';
    else { const p = checkFile(file); if (p) next.file = p; }
    setErrors(next);
    if (Object.keys(next).length) { setNotice({ kind: 'error', title: 'Le formulaire contient des erreurs', text: 'Corrigez les champs signalés.' }); return; }
    setNotice(null);
    create.mutate();
  }

  return (
    <Modal title="Ajouter un document" onClose={onClose}>
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
        <div className="field">
          <label className="field__label" htmlFor={fileId}>Fichier<span className="field__req" aria-hidden="true"> *</span><span className="sr-only"> (obligatoire)</span></label>
          <input id={fileId} className="file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            aria-invalid={errors.file ? true : undefined} aria-describedby={`${fileId}-h`} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="field__hint" id={`${fileId}-h`}>PDF, JPG ou PNG, 10 Mo au plus.</div>
          {errors.file && <p className="field__error">{errors.file}</p>}
        </div>
        {!proposer && <Checkbox label="Mettre ce document à la une du tableau de bord" checked={f.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} />}
        <Footer pending={create.isPending} label="Publier le document" onCancel={onClose} />
      </form>
    </Modal>
  );
}

/* ───────────── Opportunité ───────────── */
export function AddOpportunityModal({ onClose, onDone, proposer }: Props) {
  const qc = useQueryClient();
  const [f, setF] = useState({ type: 'CALL_FOR_PROJECTS', title: '', summary: '', body: '', deadline: '', audience: '', modality: '', visibility: 'MEMBERS' });
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));

  const create = useMutation({
    mutationFn: () => api('/opportunities', {
      method: 'POST',
      body: {
        type: f.type, title: f.title.trim(), summary: f.summary.trim(), visibility: f.visibility,
        body: f.body.trim() || undefined, deadline: f.deadline || undefined,
        audience: f.audience.trim() || undefined, modality: f.modality.trim() || undefined,
      },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] }); qc.invalidateQueries({ queryKey: ['dashboard'] });
      onDone(sentNotice(proposer, 'Opportunité publiée', f.title.trim()));
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
    <Modal title="Ajouter une opportunité" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <ProposerNote proposer={proposer} />
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
        <Footer pending={create.isPending} label={proposer ? 'Envoyer pour validation' : 'Publier l’opportunité'} onCancel={onClose} />
      </form>
    </Modal>
  );
}

/* ───────────── Événement ───────────── */
export function AddEventModal({ onClose, onDone, proposer }: Props) {
  const qc = useQueryClient();
  const [f, setF] = useState({ type: 'MEETING', title: '', description: '', startsAt: '', endsAt: '', mode: 'ONSITE', location: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));

  const create = useMutation({
    mutationFn: () => api('/events', {
      method: 'POST',
      body: {
        type: f.type, title: f.title.trim(), mode: f.mode,
        description: f.description.trim() || undefined, location: f.location.trim() || undefined,
        startsAt: new Date(f.startsAt).toISOString(), endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : undefined,
      },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] }); qc.invalidateQueries({ queryKey: ['dashboard'] });
      onDone(sentNotice(proposer, 'Événement ajouté à l’agenda', f.title.trim()));
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
    <Modal title="Ajouter un événement" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <ProposerNote proposer={proposer} />
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
        <Footer pending={create.isPending} label={proposer ? 'Envoyer pour validation' : 'Ajouter à l’agenda'} onCancel={onClose} />
      </form>
    </Modal>
  );
}

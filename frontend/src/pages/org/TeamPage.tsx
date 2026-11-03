import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { TeamMember } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { formatDate } from '../../lib/format';
import { usePageTitle } from '../../lib/usePageTitle';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { SelectField, TextField } from '../../ui/Field';
import { errorNotice, Flash, type Notice } from '../../ui/Flash';
import { Spinner } from '../../ui/Spinner';

const DEPUTY = { value: 'OPH_DEPUTY', label: 'Suppléant : agit à la place du Président en son absence' };
const ROLES = [
  { value: 'OPH_CONTRIBUTOR', label: 'Contributeur : peut envoyer des rapports et des actualités' },
  { value: 'OPH_VIEWER', label: 'Consultation : peut seulement lire' },
];
const STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Compte actif', cls: 'badge--green' },
  INVITED: { label: 'Invitation envoyée', cls: 'badge--orange' },
  DISABLED: { label: 'Désactivé', cls: 'badge--grey' },
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const empty = { firstName: '', lastName: '', email: '', jobTitle: '', roleCode: 'OPH_CONTRIBUTOR' };

export function TeamPage() {
  usePageTitle('Mon équipe');
  const { user, can } = useAuth();
  const manage = can('organization.members.manage');
  const isPresident = user!.organizationRole?.code === 'OPH_PRESIDENT';
  // Seul le Président nomme un Suppléant ; le Suppléant gère le reste de l'équipe.
  const roleOptions = isPresident ? [DEPUTY, ...ROLES] : ROLES;
  const orgId = user!.organizationId!;
  const qc = useQueryClient();
  const key = ['org', orgId, 'members'];
  const list = useQuery({ queryKey: key, queryFn: () => api<TeamMember[]>(`/organizations/${orgId}/members`) });

  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof empty, string>>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const firstName = useRef<HTMLInputElement>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const invite = useMutation({
    mutationFn: (f: typeof empty) => api(`/organizations/${orgId}/members`, { method: 'POST', body: { ...f, jobTitle: f.jobTitle || undefined } }),
    onSuccess: () => { setNotice({ kind: 'success', title: 'Invitation envoyée', text: `Un e-mail a été envoyé à ${form.email} pour activer son compte.` }); setForm(empty); refresh(); },
    onError: (e) => setNotice(errorNotice(e, 'Invitation impossible')),
  });
  const changeRole = useMutation({
    mutationFn: (v: { id: string; roleCode: string }) => api(`/organizations/${orgId}/members/${v.id}`, { method: 'PATCH', body: { roleCode: v.roleCode } }),
    onSuccess: () => { setNotice({ kind: 'success', title: 'Rôle modifié' }); refresh(); },
    onError: (e) => setNotice(errorNotice(e, 'Modification impossible')),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/organizations/${orgId}/members/${id}`, { method: 'DELETE' }),
    onSuccess: () => { setRemoving(null); setNotice({ kind: 'success', title: 'Personne retirée de l’équipe', text: 'Son compte a été désactivé.' }); refresh(); },
    onError: (e) => { setRemoving(null); setNotice(errorNotice(e, 'Retrait impossible')); },
  });
  const resend = useMutation({
    mutationFn: (id: string) => api(`/organizations/${orgId}/members/${id}/resend-invitation`, { method: 'POST' }),
    onSuccess: () => setNotice({ kind: 'success', title: 'Invitation renvoyée' }),
    onError: (e) => setNotice(errorNotice(e, 'Envoi impossible')),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    const next: typeof errors = {};
    if (!form.firstName.trim()) next.firstName = 'Saisissez le prénom.';
    if (!form.lastName.trim()) next.lastName = 'Saisissez le nom.';
    if (!form.email.trim()) next.email = 'Saisissez l’adresse e-mail.';
    else if (!EMAIL.test(form.email.trim())) next.email = 'Adresse e-mail invalide. Exemple : nom@association.ci';
    setErrors(next);
    if (Object.keys(next).length) {
      setNotice({ kind: 'error', title: 'Le formulaire contient des erreurs', text: 'Corrigez les champs signalés.' });
      return;
    }
    invite.mutate({ ...form, email: form.email.trim(), firstName: form.firstName.trim(), lastName: form.lastName.trim() });
  }

  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const members = list.data ?? [];

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Mon équipe</h1>
        <p>{manage ? 'Les personnes de votre organisation qui utilisent cet espace. Vous pouvez en inviter d’autres.' : 'Les personnes de votre organisation qui utilisent cet espace.'}</p>
      </div>

      <Flash notice={notice} />

      <section className="panel" aria-labelledby="liste">
        <h2 id="liste" className="panel__title">Personnes de l’équipe</h2>
        {list.isLoading && <Spinner />}
        {list.isError && <Alert kind="error" title="Chargement impossible">{list.error.message}</Alert>}
        {list.data && (
          <ul className="plain-list">
            {members.map((m) => {
              const isChief = m.role.code === 'OPH_PRESIDENT';
              const locked = isChief || (m.role.code === 'OPH_DEPUTY' && !isPresident);
              const name = `${m.firstName} ${m.lastName}`;
              const st = STATUS[m.status];
              return (
                <li key={m.userId}>
                  <span className="item__title">{name}</span>
                  <span className="item__meta">
                    {m.role.label}{m.jobTitle ? ` · ${m.jobTitle}` : ''}{m.email ? ` · ${m.email}` : ''}
                    {m.lastLoginAt ? ` · dernière connexion le ${formatDate(m.lastLoginAt)}` : ''}
                  </span>
                  {manage && <> <span className={`badge ${st.cls}`}>{st.label}</span></>}
                  {manage && !locked && (
                    <div className="row" style={{ marginTop: 'var(--space-3)' }}>
                      <SelectField label={`Rôle de ${name}`} value={m.role.code} options={roleOptions}
                        onChange={(e) => changeRole.mutate({ id: m.userId, roleCode: e.target.value })} />
                      {m.status === 'INVITED' && (
                        <Button variant="secondary" onClick={() => resend.mutate(m.userId)} aria-label={`Renvoyer l’invitation à ${name}`}>Renvoyer l’invitation</Button>
                      )}
                      <Button variant="secondary" onClick={() => setRemoving(m.userId)} aria-label={`Retirer ${name} de l’équipe`}>Retirer</Button>
                    </div>
                  )}
                  {removing === m.userId && (
                    <div className="confirm" role="group" aria-label={`Confirmer le retrait de ${name}`}>
                      <p><strong>Retirer {name} ?</strong> Son compte sera désactivé et il ne pourra plus se connecter.</p>
                      <div className="row">
                        <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(m.userId)}>Oui, retirer cette personne</Button>
                        <Button variant="secondary" onClick={() => setRemoving(null)}>Non, la garder</Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {manage && (
        <form className="panel" onSubmit={submit} noValidate aria-labelledby="inviter">
          <h2 id="inviter" className="panel__title">Inviter une personne</h2>
          <p className="muted">Elle recevra un e-mail pour choisir son mot de passe. Votre organisation n’a qu’un seul Président.</p>
          <div className="form-grid">
            <TextField ref={firstName} label="Prénom" required autoComplete="off" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} error={errors.firstName} />
            <TextField label="Nom" required autoComplete="off" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} error={errors.lastName} />
            <TextField label="Adresse e-mail" type="email" required autoComplete="off" value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
            <TextField label="Fonction" autoComplete="off" value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} hint="Facultatif. Exemple : Secrétaire" />
          </div>
          <SelectField label="Ce que cette personne pourra faire" value={form.roleCode} options={roleOptions} onChange={(e) => set('roleCode', e.target.value)} />
          <div className="form-actions">
            <Button type="submit" loading={invite.isPending}>{invite.isPending ? 'Envoi…' : 'Envoyer l’invitation'}</Button>
          </div>
        </form>
      )}
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { DirectoryFilters, OrganizationProfile } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { formatDate } from '../../lib/format';
import { usePageTitle } from '../../lib/usePageTitle';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { CheckGroup, SelectField, TextField } from '../../ui/Field';
import { errorNotice, Flash, type Notice } from '../../ui/Flash';
import { Spinner } from '../../ui/Spinner';

const STATUS: Record<string, string> = { ACTIVE: 'Active', SUSPENDED: 'Suspendue', ARCHIVED: 'Archivée' };
const PHONE = /^[+0-9 ().-]{6,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Form {
  acronym: string; commune: string; address: string; postalAddress: string; regionId: string; phone: string; email: string;
  website: string; interventionZone: string; domainIds: string[]; disabilityTypeIds: string[];
}
const toForm = (o: OrganizationProfile): Form => ({
  acronym: o.acronym ?? '', commune: o.commune ?? '', address: o.address ?? '', postalAddress: o.postalAddress ?? '',
  regionId: o.region?.id ?? '', phone: o.phone ?? '', email: o.email ?? '', website: o.website ?? '',
  interventionZone: o.interventionZone ?? '', domainIds: o.domains.map((d) => d.id), disabilityTypeIds: o.disabilityTypes.map((d) => d.id),
});

export function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {};
  if (f.phone && !PHONE.test(f.phone)) e.phone = 'Numéro invalide. Exemple : +225 07 00 00 00 00';
  if (f.email && !EMAIL.test(f.email)) e.email = 'Adresse e-mail invalide. Exemple : contact@association.ci';
  if (f.website && !/^https?:\/\/\S+\.\S+/.test(f.website)) e.website = 'Adresse du site invalide. Commencez par https://';
  return e;
}

export function OrganizationPage() {
  usePageTitle('Mon organisation');
  const { can } = useAuth();
  const editable = can('organization.update');
  const qc = useQueryClient();
  const org = useQuery({ queryKey: ['org', 'me'], queryFn: () => api<OrganizationProfile>('/organizations/me') });
  const filters = useQuery({ queryKey: ['filters'], queryFn: () => api<DirectoryFilters>('/directory/filters', { auth: false }), staleTime: 3_600_000 });
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => { if (org.data) setForm(toForm(org.data)); }, [org.data]);

  const save = useMutation({
    mutationFn: (f: Form) => api<OrganizationProfile>(`/organizations/${org.data!.id}`, {
      method: 'PATCH',
      body: { ...f, regionId: f.regionId || null },
    }),
    onSuccess: (data) => {
      qc.setQueryData(['org', 'me'], data);
      setNotice({ kind: 'success', title: 'Modifications enregistrées', text: 'Le profil de votre organisation est à jour.' });
    },
    onError: (e) => setNotice(errorNotice(e, 'Enregistrement impossible')),
  });

  if (org.isLoading || !form) return org.isError
    ? <Alert kind="error" title="Chargement impossible">{org.error.message}</Alert>
    : <Spinner />;
  const o = org.data!;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  function submit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    const next = validate(form!);
    setErrors(next);
    if (Object.keys(next).length) {
      setNotice({ kind: 'error', title: 'Le formulaire contient des erreurs', text: 'Corrigez les champs signalés puis enregistrez de nouveau.' });
      return;
    }
    save.mutate(form!);
  }

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Mon organisation</h1>
        <p>{editable ? 'Mettez à jour les informations de votre organisation.' : 'Informations de votre organisation. Seuls le Président et son suppléant peuvent les modifier.'}</p>
      </div>

      <section className="panel" aria-labelledby="ident">
        <h2 id="ident" className="panel__title">Identité</h2>
        <dl className="dl">
          <dt>Nom</dt><dd>{o.name}</dd>
          <dt>Numéro de membre</dt><dd>{o.memberNumber ?? 'Pas encore attribué'}</dd>
          <dt>Statut</dt><dd><span className="badge badge--green">{STATUS[o.status] ?? o.status}</span></dd>
          <dt>Délégation</dt><dd>{o.delegation?.name ?? 'Non rattachée'}</dd>
          {o.registeredAt && <><dt>Membre depuis</dt><dd>{formatDate(o.registeredAt)}</dd></>}
          <dt>Personnes de l’équipe</dt><dd>{o.memberCount}</dd>
        </dl>
        <p className="item__meta" style={{ marginTop: 'var(--space-4)' }}>
          Le nom, le numéro de membre et la délégation sont gérés par la CAPH-CI. Pour les corriger, contactez-nous.
        </p>
      </section>

      <form onSubmit={submit} noValidate className="panel" aria-labelledby="coord">
        <h2 id="coord" className="panel__title">Coordonnées et activités</h2>
        <Flash notice={notice} />
        <div className="form-grid">
          <TextField label="Sigle" value={form.acronym} disabled={!editable} maxLength={30} onChange={(e) => set('acronym', e.target.value)} />
          <TextField label="Commune" value={form.commune} disabled={!editable} onChange={(e) => set('commune', e.target.value)} />
          <SelectField label="Région" value={form.regionId} disabled={!editable} placeholder="Choisir une région"
            options={(filters.data?.regions ?? []).map((r) => ({ value: r.id, label: r.name }))} onChange={(e) => set('regionId', e.target.value)} />
          <TextField label="Zone d’intervention" value={form.interventionZone} disabled={!editable} onChange={(e) => set('interventionZone', e.target.value)}
            hint="Exemple : District d’Abidjan et Sud-Comoé" />
          <TextField label="Adresse du siège" value={form.address} disabled={!editable} autoComplete="street-address" onChange={(e) => set('address', e.target.value)} />
          <TextField label="Adresse postale" value={form.postalAddress} disabled={!editable} onChange={(e) => set('postalAddress', e.target.value)} />
          <TextField label="Téléphone" type="tel" inputMode="tel" value={form.phone} disabled={!editable} onChange={(e) => set('phone', e.target.value)} error={errors.phone} />
          <TextField label="Adresse e-mail de l’organisation" type="email" value={form.email} disabled={!editable} onChange={(e) => set('email', e.target.value)} error={errors.email}
            hint="Utilisée par la CAPH-CI pour vous écrire. Elle n’apparaît pas dans l’annuaire." />
          <TextField label="Site internet" type="url" value={form.website} disabled={!editable} onChange={(e) => set('website', e.target.value)} error={errors.website}
            hint="Exemple : https://www.association.ci" />
        </div>
        <CheckGroup legend="Domaines d’intervention" items={(filters.data?.domains ?? [])} selected={form.domainIds}
          onChange={(v) => set('domainIds', v)} disabled={!editable} />
        <CheckGroup legend="Types de handicap concernés" items={(filters.data?.disabilityTypes ?? [])} selected={form.disabilityTypeIds}
          onChange={(v) => set('disabilityTypeIds', v)} disabled={!editable} />
        {editable && (
          <div className="form-actions">
            <Button type="submit" loading={save.isPending}>{save.isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}</Button>
            <Button variant="secondary" onClick={() => { setForm(toForm(o)); setErrors({}); setNotice(null); }}>Annuler les changements</Button>
          </div>
        )}
      </form>
    </div>
  );
}

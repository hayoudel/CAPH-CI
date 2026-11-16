import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { Visibility } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { formatDate } from '../../lib/format';
import { usePageTitle } from '../../lib/usePageTitle';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Checkbox, TextField } from '../../ui/Field';
import { errorNotice, Flash, type Notice } from '../../ui/Flash';
import { Spinner } from '../../ui/Spinner';

const PHONE = /^[+0-9 ().-]{6,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function VisibilityPage() {
  usePageTitle('Annuaire public');
  const { user, can } = useAuth();
  const editable = can('organization.visibility.update');
  const orgId = user!.organizationId!;
  const qc = useQueryClient();
  const key = ['org', orgId, 'visibility'];
  const q = useQuery({ queryKey: key, queryFn: () => api<Visibility>(`/organizations/${orgId}/visibility`) });
  const [v, setV] = useState<Visibility | null>(null);
  const [errors, setErrors] = useState<{ publicEmail?: string; publicPhone?: string }>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  useEffect(() => { if (q.data) setV(q.data); }, [q.data]);

  const save = useMutation({
    mutationFn: (body: object) => api<Visibility>(`/organizations/${orgId}/visibility`, { method: 'PATCH', body }),
    onSuccess: (data) => { qc.setQueryData(key, data); setV(data); },
    onError: (e) => setNotice(errorNotice(e, 'Enregistrement impossible')),
  });

  if (q.isError) return <Alert kind="error" title="Chargement impossible">{q.error.message}</Alert>;
  if (!v) return <Spinner />;

  const setField = (k: keyof Visibility['fieldVisibility'], on: boolean) => setV({ ...v, fieldVisibility: { ...v.fieldVisibility, [k]: on } });

  function submit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    const next: typeof errors = {};
    if (v!.publicEmail && !EMAIL.test(v!.publicEmail)) next.publicEmail = 'Adresse e-mail invalide.';
    if (v!.publicPhone && !PHONE.test(v!.publicPhone)) next.publicPhone = 'Numéro invalide. Exemple : +225 07 00 00 00 00';
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(
      { isListed: v!.isListed, publicEmail: v!.publicEmail ?? '', publicPhone: v!.publicPhone ?? '', fieldVisibility: v!.fieldVisibility },
      { onSuccess: () => setNotice({ kind: 'success', title: 'Choix enregistrés', text: v!.isListed ? 'Votre organisation apparaît dans l’annuaire.' : 'Votre organisation n’apparaît pas dans l’annuaire.' }) },
    );
  }

  function withdraw() {
    setNotice(null);
    save.mutate({ publicationConsent: false }, {
      onSuccess: () => setNotice({ kind: 'success', title: 'Consentement retiré', text: 'Votre organisation a été retirée de l’annuaire immédiatement.' }),
    });
  }
  function consent() {
    setNotice(null);
    save.mutate({ publicationConsent: true }, {
      onSuccess: () => setNotice({ kind: 'success', title: 'Consentement enregistré', text: 'Vous pouvez maintenant choisir d’apparaître dans l’annuaire.' }),
    });
  }

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Annuaire public</h1>
        <p>L’annuaire est visible par tout le monde, sans connexion. Vous décidez si votre organisation y figure et quelles coordonnées sont montrées.</p>
      </div>
      <Flash notice={notice} />

      <section className="panel" aria-labelledby="cons">
        <h2 id="cons" className="panel__title">Consentement de publication</h2>
        {v.publicationConsent ? (
          <>
            <p>Vous avez accepté la publication de votre organisation{v.publicationConsentAt ? ` le ${formatDate(v.publicationConsentAt)}` : ''}.</p>
            {editable && <Button variant="secondary" onClick={withdraw} loading={save.isPending}>Retirer mon consentement</Button>}
            {editable && <p className="item__meta">Retirer le consentement retire aussitôt votre organisation de l’annuaire.</p>}
          </>
        ) : (
          <>
            <p>Pour figurer dans l’annuaire, la CAPH-CI a besoin de votre accord. Seules les informations que vous cochez ci-dessous seront montrées : le nom, la région, la commune, les domaines et les types de handicap sont toujours affichés.</p>
            {editable
              ? <Button onClick={consent} loading={save.isPending}>J’accepte la publication de mon organisation</Button>
              : <p className="item__meta">Seuls le Président et son suppléant peuvent donner ce consentement.</p>}
          </>
        )}
      </section>

      <form className="panel" onSubmit={submit} noValidate aria-labelledby="choix">
        <h2 id="choix" className="panel__title">Ce qui est visible</h2>
        <Checkbox label="Faire apparaître mon organisation dans l’annuaire" checked={v.isListed}
          disabled={!editable || !v.publicationConsent} onChange={(e) => setV({ ...v, isListed: e.target.checked })} />
        {!v.publicationConsent && <p className="item__meta">Donnez d’abord votre consentement ci-dessus.</p>}
        <p className="muted" style={{ marginTop: 'var(--space-4)' }}>L’e-mail et le téléphone publiés peuvent être différents de ceux de votre organisation.</p>
        <div className="form-grid">
          <div>
            <TextField label="E-mail à publier" type="email" value={v.publicEmail ?? ''} disabled={!editable} error={errors.publicEmail}
              onChange={(e) => setV({ ...v, publicEmail: e.target.value })} />
            <Checkbox label="Montrer cet e-mail" checked={v.fieldVisibility.publicEmail} disabled={!editable} onChange={(e) => setField('publicEmail', e.target.checked)} />
          </div>
          <div>
            <TextField label="Téléphone à publier" type="tel" inputMode="tel" value={v.publicPhone ?? ''} disabled={!editable} error={errors.publicPhone}
              onChange={(e) => setV({ ...v, publicPhone: e.target.value })} />
            <Checkbox label="Montrer ce téléphone" checked={v.fieldVisibility.publicPhone} disabled={!editable} onChange={(e) => setField('publicPhone', e.target.checked)} />
          </div>
        </div>
        <Checkbox label="Montrer l’adresse postale (celle de la page « Mon organisation »)" checked={v.fieldVisibility.postalAddress} disabled={!editable} onChange={(e) => setField('postalAddress', e.target.checked)} />
        <Checkbox label="Montrer le site internet (celui de la page « Mon organisation »)" checked={v.fieldVisibility.website} disabled={!editable} onChange={(e) => setField('website', e.target.checked)} />
        {editable && <div className="form-actions"><Button type="submit" loading={save.isPending}>Enregistrer mes choix</Button></div>}
      </form>
    </div>
  );
}

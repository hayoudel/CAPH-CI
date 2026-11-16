import { useMutation } from '@tanstack/react-query';
import { useRef, useState, type ChangeEvent } from 'react';
import { api, ApiError } from '../../api/client';
import type { MembershipRequirements, MembershipRequestView } from '../../api/types';
import { DOC_STATUS_LABELS, formatSize, REQUIREMENT_LABELS, stepOfField } from '../../lib/adhesion';
import type { Draft } from '../../lib/draft';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Checkbox, TextField } from '../../ui/Field';

export interface Submitted { reference: string; code: string }
const headers = (d: Draft) => ({ 'x-tracking-code': d.code });
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PER_TYPE = 3;
const TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

// ───────────────────────────── Étape 6 : pièces ─────────────────────────────

export function DocumentsStep({ draft, view, onChanged }: { draft: Draft; view: MembershipRequestView; onChanged: (v: MembershipRequestView) => void }) {
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const refresh = async () => onChanged(await api<MembershipRequestView>(`/memberships/requests/${draft.id}`, { auth: false, headers: headers(draft) }));

  async function upload(type: string, label: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMsg(null);
    if (!TYPES.includes(file.type)) return setMsg({ kind: 'error', text: `« ${file.name} » n’est pas accepté : choisissez un fichier PDF, JPG ou PNG.` });
    if (file.size > MAX_BYTES) return setMsg({ kind: 'error', text: `« ${file.name} » est trop volumineux (${formatSize(file.size)}). Maximum : 10 Mo.` });
    if (view.documents.filter((d) => d.type === type).length >= MAX_PER_TYPE) return setMsg({ kind: 'error', text: `Vous avez déjà ${MAX_PER_TYPE} fichiers pour cette pièce. Retirez-en un pour en ajouter un autre.` });
    setBusy(type);
    try {
      const fd = new FormData();
      fd.append('type', type);
      fd.append('file', file);
      await api(`/memberships/requests/${draft.id}/documents`, { method: 'POST', auth: false, headers: headers(draft), body: fd });
      await refresh();
      setMsg({ kind: 'success', text: `« ${file.name} » a bien été ajouté à : ${label}.` });
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof Error ? err.message : 'Envoi impossible. Réessayez.' });
    } finally { setBusy(null); }
  }

  async function remove(docId: string, name: string) {
    setMsg(null);
    setBusy(docId);
    try {
      await api(`/memberships/requests/${draft.id}/documents/${docId}`, { method: 'DELETE', auth: false, headers: headers(draft) });
      await refresh();
      setMsg({ kind: 'success', text: `« ${name} » a été retiré.` });
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof Error ? err.message : 'Retrait impossible.' });
    } finally { setBusy(null); }
  }

  const asked = view.documentSpecs.filter((s) => s.requirement !== 'AFTER_ADMISSION');
  const later = view.documentSpecs.filter((s) => s.requirement === 'AFTER_ADMISSION');
  return (
    <>
      <p className="muted">Ajoutez vos justificatifs au format PDF, JPG ou PNG (10 Mo au maximum par fichier, 3 fichiers par pièce). Une photo prise avec un téléphone convient si elle est lisible.</p>
      {msg && <Alert kind={msg.kind} title={msg.kind === 'error' ? 'Ajout impossible' : 'Fait'}>{msg.text}</Alert>}
      <div>
        {asked.map((s) => {
          const files = view.documents.filter((d) => d.type === s.type);
          const id = `file-${s.type}`;
          return (
            <section key={s.type} className="doc-row" aria-labelledby={`${id}-t`}>
              <h3 id={`${id}-t`}>{s.label} <span className={`badge ${s.requirement === 'REQUIRED' ? 'badge--orange' : 'badge--grey'}`}>{REQUIREMENT_LABELS[s.requirement]}</span></h3>
              {files.length > 0 && (
                <ul>
                  {files.map((f) => (
                    <li key={f.id} className="doc-file">
                      <span><strong>{f.originalName}</strong> <span className="item__meta">({formatSize(f.sizeBytes)})</span></span>
                      <span className={`badge ${f.status === 'ACCEPTED' ? 'badge--green' : f.status === 'REJECTED' ? 'badge--orange' : 'badge--grey'}`}>{DOC_STATUS_LABELS[f.status]}</span>
                      {f.reviewNote && <span className="item__meta">{f.reviewNote}</span>}
                      {f.status !== 'ACCEPTED' && <Button variant="secondary" loading={busy === f.id} onClick={() => remove(f.id, f.originalName)} aria-label={`Retirer ${f.originalName}`}>Retirer</Button>}
                    </li>
                  ))}
                </ul>
              )}
              <label htmlFor={id} className="field__label">{files.length ? 'Ajouter un autre fichier' : 'Choisir un fichier'}<span className="sr-only"> pour : {s.label}</span></label>
              <input ref={(el) => { inputs.current[s.type] = el; }} id={id} type="file" className="file-input" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                disabled={busy === s.type} onChange={(e) => upload(s.type, s.label, e)} />
              {busy === s.type && <p role="status">Envoi en cours…</p>}
            </section>
          );
        })}
      </div>
      {later.length > 0 && <p className="item__meta">À fournir plus tard, après l’admission : {later.map((l) => l.label.toLowerCase()).join(', ')}.</p>}
      {view.completeness.missingDocuments.length > 0 && (
        <p className="item__meta">Pièces obligatoires encore manquantes : {view.completeness.missingDocuments.map((d) => d.label).join(' ; ')}. Vous pourrez continuer et les ajouter avant de déposer.</p>
      )}
    </>
  );
}

// ───────────────────────────── Étape 7 : récapitulatif et dépôt ─────────────────────────────

export function RecapStep({ draft, view, reqs, onGoTo, onSubmitted }: {
  draft: Draft; view: MembershipRequestView; reqs: MembershipRequirements; onGoTo: (i: number) => void; onSubmitted: (s: Submitted) => void;
}) {
  const [acceptAccuracy, setA] = useState(false);
  const [acceptStatutes, setS] = useState(false);
  const [acceptDataProcessing, setD] = useState(false);
  const [signerName, setSigner] = useState('');
  const [publicationConsent, setPub] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<{ title: string; items: { field?: string; message: string }[] } | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const submit = useMutation({
    mutationFn: () => api<{ reference: string }>(`/memberships/requests/${draft.id}/submit`, {
      method: 'POST', auth: false, headers: headers(draft),
      body: { acceptAccuracy, acceptStatutes, acceptDataProcessing, signerName: signerName.trim(), publicationConsent },
    }),
    onSuccess: (r) => onSubmitted({ reference: r.reference, code: draft.code }),
    onError: (e) => {
      const fe = e instanceof ApiError ? e.fieldErrors : [];
      setServerError({ title: e.message, items: fe.length ? fe : (e instanceof ApiError && e.details ? e.details.map((m) => ({ message: m })) : []) });
      setTimeout(() => alertRef.current?.focus(), 0);
    },
  });

  function go() {
    setServerError(null);
    const e: Record<string, string> = {};
    if (!acceptAccuracy) e.acceptAccuracy = 'Cochez cette case pour certifier l’exactitude des renseignements.';
    if (!acceptStatutes) e.acceptStatutes = 'Cochez cette case pour accepter les statuts, le règlement intérieur et les politiques.';
    if (!acceptDataProcessing) e.acceptDataProcessing = 'Cochez cette case pour confirmer avoir pris connaissance du traitement de vos données.';
    if (signerName.trim().length < 2) e.signerName = 'Saisissez votre nom complet pour signer.';
    setErrors(e);
    if (Object.keys(e).length) return;
    if (!view.completeness.complete) { setServerError({ title: 'Votre dossier est incomplet', items: [] }); setTimeout(() => alertRef.current?.focus(), 0); return; }
    submit.mutate();
  }

  const opt = reqs.options;
  const regionName = (id: unknown) => opt.regions.find((r) => r.id === id)?.name ?? '';
  const names = (list: { id: string; label: string }[], ids: unknown) => (Array.isArray(ids) ? ids.map((i) => list.find((x) => x.id === i)?.label).filter(Boolean).join(', ') : '');
  const display = (section: string, key: string): string => {
    const v = view.data?.[section]?.[key];
    if (v === undefined || v === null || v === '') return '';
    if (key === 'regionId') return regionName(v);
    if (key === 'interventionDomainIds') return names(opt.domains, v);
    if (key === 'disabilityTypeIds') return names(opt.disabilityTypes, v);
    return String(v);
  };

  const blocks: { title: string; step: number; rows: [string, string][] }[] = [
    { title: 'Vous', step: 0, rows: [['Type de demande', view.requestType === 'RENEWAL' ? `Renouvellement (n° ${view.existingMemberNumber ?? ''})` : 'Première adhésion'], ['Nom', view.applicant.name], ['E-mail', view.applicant.email], ['Téléphone', view.applicant.phone ?? '']] },
    { title: 'Organisation', step: 1, rows: Object.entries(reqs.fields?.organization ?? {}).filter(([k]) => !['interventionDomainIds', 'disabilityTypeIds', 'interventionZone'].includes(k)).map(([k, s]) => [s.label, display('organization', k)] as [string, string]) },
    { title: 'Activités et territoire', step: 2, rows: [
      ['Domaines d’intervention', display('organization', 'interventionDomainIds')], ['Types de handicap', display('organization', 'disabilityTypeIds')],
      ['Zone d’intervention', display('organization', 'interventionZone')], ['Délégation', opt.delegations.find((d) => d.id === view.delegationId)?.name ?? ''],
    ] },
    { title: 'Représentant habilité', step: 3, rows: Object.entries(reqs.fields?.representative ?? {}).map(([k, s]) => [s.label, display('representative', k)] as [string, string]) },
    { title: 'Responsables', step: 4, rows: [
      ...Object.entries(reqs.fields?.secretaryGeneral ?? {}).map(([k, s]) => [s.label, display('secretaryGeneral', k)] as [string, string]),
      ...Object.entries(reqs.fields?.treasurer ?? {}).map(([k, s]) => [s.label, display('treasurer', k)] as [string, string]),
    ] },
    { title: 'Pièces jointes', step: 5, rows: [['Fichiers ajoutés', view.documents.length ? view.documents.map((d) => `${d.label} (${d.originalName})`).join(' ; ') : 'Aucun']] },
  ];
  const missing = [...view.completeness.missingFields, ...view.completeness.missingDocuments.map((d) => ({ field: `documents.${d.type}`, message: `Pièce obligatoire manquante : ${d.label}.` }))];

  return (
    <>
      <p className="muted">Relisez votre dossier. Vous pouvez corriger chaque partie avant de le déposer.</p>

      {missing.length > 0 && (
        <Alert kind="error" title="Il manque des informations pour déposer le dossier">
          <ul>
            {missing.map((m) => (
              <li key={m.field}>{m.message} <button type="button" className="linklike" onClick={() => onGoTo(stepOfField(m.field))}>Corriger</button></li>
            ))}
          </ul>
        </Alert>
      )}

      {blocks.map((b) => (
        <section key={b.title} className="recap" aria-labelledby={`r-${b.step}`} style={{ marginBottom: 'var(--space-5)' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 id={`r-${b.step}`} style={{ margin: 0 }}>{b.title}</h3>
            <Button variant="secondary" onClick={() => onGoTo(b.step)} aria-label={`Modifier : ${b.title}`}>Modifier</Button>
          </div>
          <dl className="dl" style={{ marginTop: 'var(--space-3)' }}>
            {b.rows.map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v || <span className="item__meta">Non renseigné</span>}</dd></div>)}
          </dl>
        </section>
      ))}

      <section aria-labelledby="decl" className="panel panel--soft">
        <h3 id="decl">Déclarations</h3>
        {serverError && (
          <Alert ref={alertRef} kind="error" title={serverError.title}>
            {serverError.items.length > 0 && <ul>{serverError.items.map((i, n) => <li key={n}>{i.message} {i.field && <button type="button" className="linklike" onClick={() => onGoTo(stepOfField(i.field!))}>Corriger</button>}</li>)}</ul>}
          </Alert>
        )}
        <Checkbox label={reqs.declarations.acceptAccuracy} checked={acceptAccuracy} aria-invalid={errors.acceptAccuracy ? true : undefined} onChange={(e) => setA(e.target.checked)} />
        {errors.acceptAccuracy && <p className="field__error">{errors.acceptAccuracy}</p>}
        <Checkbox label={reqs.declarations.acceptStatutes} checked={acceptStatutes} aria-invalid={errors.acceptStatutes ? true : undefined} onChange={(e) => setS(e.target.checked)} />
        {errors.acceptStatutes && <p className="field__error">{errors.acceptStatutes}</p>}
        <p className="item__meta">{reqs.declarations.acceptDataProcessing}</p>
        <Checkbox label="J’ai pris connaissance du traitement de mes données personnelles." checked={acceptDataProcessing} aria-invalid={errors.acceptDataProcessing ? true : undefined} onChange={(e) => setD(e.target.checked)} />
        {errors.acceptDataProcessing && <p className="field__error">{errors.acceptDataProcessing}</p>}
        <hr />
        <Checkbox label="J’accepte que mon organisation apparaisse dans l’annuaire public des membres, une fois admise (facultatif)." checked={publicationConsent} onChange={(e) => setPub(e.target.checked)} />
        <TextField label="Je soussigné(e)" required autoComplete="name" value={signerName} error={errors.signerName} hint="Saisissez votre nom complet : cela vaut signature de la demande."
          onChange={(e) => setSigner(e.target.value)} />
        <Button onClick={go} loading={submit.isPending}>{submit.isPending ? 'Dépôt en cours…' : 'Déposer mon dossier'}</Button>
        <p className="item__meta" style={{ marginTop: 'var(--space-3)' }}>Après le dépôt, vous ne pourrez plus modifier le dossier, sauf si la CAPH-CI vous demande des compléments.</p>
      </section>
    </>
  );
}

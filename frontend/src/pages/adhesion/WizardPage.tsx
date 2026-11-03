import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import type { MembershipRequirements, MembershipRequestView } from '../../api/types';
import { checkField, getSpec, STEP_FIELDS, STEPS } from '../../lib/adhesion';
import { clearDraft, loadDraft, saveDraft, type Draft } from '../../lib/draft';
import { usePageTitle } from '../../lib/usePageTitle';
import { Alert } from '../../ui/Alert';
import { Button, LinkButton } from '../../ui/Button';
import { Spinner } from '../../ui/Spinner';
import { DocumentsStep, RecapStep, type Submitted } from './steps2';
import { ActivitiesStep, ApplicantStep, FormCtx, type Values, FieldsStep } from './steps1';

const codeHeader = (d: Draft) => ({ 'x-tracking-code': d.code });

/** Valeurs de formulaire (à plat) à partir du dossier enregistré. */
function toValues(v: MembershipRequestView): Values {
  const out: Values = {
    requestType: v.requestType, existingMemberNumber: v.existingMemberNumber ?? '', applicantName: v.applicant.name,
    applicantPhone: v.applicant.phone ?? '', applicantEmail: v.applicant.email,
    delegationId: v.delegationId ?? '', delegationOverrideReason: v.delegationOverrideReason ?? '',
  };
  for (const [section, fields] of Object.entries(v.data ?? {})) {
    for (const [k, val] of Object.entries(fields)) out[`${section}.${k}`] = Array.isArray(val) ? (val as string[]) : String(val ?? '');
  }
  return out;
}

export function WizardPage() {
  usePageTitle('Demande d’adhésion');
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState<Draft | null>(loadDraft);
  const [values, setValues] = useState<Values>({ requestType: 'FIRST' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ kind: 'error' | 'success' | 'info'; title: string; text?: string } | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const loadedFor = useRef<string | null>(null);

  const reqs = useQuery({ queryKey: ['requirements', 'PM_ORGANISATION'], queryFn: () => api<MembershipRequirements>('/memberships/requirements', { auth: false, query: { category: 'PM_ORGANISATION' } }) });
  const view = useQuery({
    queryKey: ['request', draft?.id], enabled: !!draft, retry: false,
    queryFn: () => api<MembershipRequestView>(`/memberships/requests/${draft!.id}`, { auth: false, headers: codeHeader(draft!) }),
  });

  // Les valeurs du formulaire sont initialisées une seule fois par dossier chargé.
  useEffect(() => {
    if (view.data && loadedFor.current !== view.data.id) { loadedFor.current = view.data.id; setValues(toValues(view.data)); }
  }, [view.data]);

  const step = Math.min(Math.max((Number(params.get('etape')) || 1) - 1, 0), STEPS.length - 1);
  // Sans dossier commencé, seule l'étape 1 est possible.
  useEffect(() => { if (!draft && step !== 0) setParams({ etape: '1' }, { replace: true }); }, [draft, step, setParams]);

  // À chaque changement d'étape : le focus va au titre ; la page remonte.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    heading.current?.focus();
    window.scrollTo?.({ top: 0 });
  }, [step]);
  useEffect(() => { if (banner) bannerRef.current?.focus(); }, [banner]);
  // Quand toutes les erreurs de champ sont corrigées, le message d'erreur général disparaît.
  useEffect(() => { if (banner?.kind === 'error' && banner.title === 'Quelques champs sont à corriger' && Object.keys(errors).length === 0) setBanner(null); }, [errors, banner]);

  const goTo = (i: number) => { setErrors({}); setBanner(null); setParams({ etape: String(i + 1) }); };
  const set = (k: string, v: string | string[]) => { setValues((p) => ({ ...p, [k]: v })); if (errors[k]) setErrors((e) => { const n = { ...e }; delete n[k]; return n; }); };

  function focusFirstError() {
    setTimeout(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
  }

  const options = reqs.data?.options;
  const specs = reqs.data?.fields ?? null;

  /** Contrôle local de l'étape (mêmes règles que le serveur) avant d'envoyer. */
  function validateStep(i: number): Record<string, string> {
    const e: Record<string, string> = {};
    const id = STEPS[i].id;
    if (id === 'demandeur') {
      if (String(values.applicantName ?? '').trim().length < 2) e.applicantName = 'Saisissez votre nom complet.';
      if (!draft && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(values.applicantEmail ?? '').trim())) e.applicantEmail = 'Adresse e-mail invalide. Exemple : nom@association.ci';
      const ph = String(values.applicantPhone ?? '').trim();
      if (ph && !/^[+0-9 ().-]{6,20}$/.test(ph)) e.applicantPhone = 'Numéro invalide. Exemple : +225 07 00 00 00 00';
      if (values.requestType === 'RENEWAL' && !String(values.existingMemberNumber ?? '').trim()) e.existingMemberNumber = 'Saisissez votre numéro de membre actuel.';
    }
    for (const path of STEP_FIELDS[id] ?? []) {
      const spec = getSpec(specs, path);
      const msg = spec ? checkField(spec, values[path]) : null;
      if (msg) e[path] = msg;
    }
    if (id === 'activites' && !values.delegationId) e.delegationId = 'Choisissez la délégation territoriale.';
    return e;
  }

  const save = useMutation({
    mutationFn: async (i: number) => {
      const id = STEPS[i].id;
      if (id === 'demandeur' && !draft) {
        const created = await api<{ id: string; trackingCode: string }>('/memberships/requests', {
          method: 'POST', auth: false,
          body: {
            categoryCode: reqs.data!.category.code, applicantName: String(values.applicantName).trim(), applicantEmail: String(values.applicantEmail).trim(),
            applicantPhone: String(values.applicantPhone ?? '').trim() || undefined, requestType: values.requestType,
          },
        });
        const d = { id: created.id, code: created.trackingCode };
        saveDraft(d);
        if (values.requestType === 'RENEWAL') {
          await api(`/memberships/requests/${d.id}`, { method: 'PATCH', auth: false, headers: codeHeader(d), body: { existingMemberNumber: String(values.existingMemberNumber).trim() } });
        }
        return { draft: d, created: true as const };
      }
      const d = draft!;
      const body: Record<string, unknown> = {};
      if (id === 'demandeur') {
        Object.assign(body, {
          requestType: values.requestType, applicantName: String(values.applicantName).trim(), applicantPhone: String(values.applicantPhone ?? '').trim(),
          existingMemberNumber: values.requestType === 'RENEWAL' ? String(values.existingMemberNumber).trim() : '',
        });
      } else {
        const data: Record<string, Record<string, unknown>> = {};
        for (const path of STEP_FIELDS[id] ?? []) {
          const [section, key] = path.split('.');
          const v = values[path];
          const isList = getSpec(specs, path)?.type === 'uuidList';
          (data[section] ??= {})[key] = isList ? (Array.isArray(v) ? v : []) : String(v ?? '').trim();
        }
        body.data = data;
        if (id === 'activites') { body.delegationId = values.delegationId || null; body.delegationOverrideReason = String(values.delegationOverrideReason ?? '').trim() || null; }
      }
      const updated = await api<MembershipRequestView>(`/memberships/requests/${d.id}`, { method: 'PATCH', auth: false, headers: codeHeader(d), body });
      qc.setQueryData(['request', d.id], updated);
      return { draft: d, created: false as const };
    },
  });

  /** Enregistre l'étape courante puis, si `then` est fourni, passe à l'étape indiquée. */
  function saveAndGo(then?: number) {
    setBanner(null);
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length) {
      setBanner({ kind: 'error', title: 'Quelques champs sont à corriger', text: 'Les champs concernés sont signalés ci-dessous.' });
      focusFirstError();
      return;
    }
    save.mutate(step, {
      onSuccess: ({ draft: d, created }) => {
        if (created) { setDraft(d); setNewCode(d.code); loadedFor.current = d.id; }
        if (then !== undefined) goTo(then);
        else setBanner({ kind: 'success', title: 'Enregistré', text: 'Vous pouvez fermer cette page et reprendre plus tard avec le lien reçu par e-mail.' });
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 404) { clearDraft(); setDraft(null); setBanner({ kind: 'error', title: 'Demande introuvable', text: 'Ce brouillon n’existe plus (il est effacé après 30 jours sans modification). Recommencez une demande.' }); return; }
        const fe: Record<string, string> = {};
        for (const f of (err instanceof ApiError ? err.fieldErrors : [])) fe[f.field] = f.message;
        setErrors(fe);
        setBanner({ kind: 'error', title: 'Enregistrement impossible', text: err instanceof Error ? err.message : 'Réessayez.' });
        if (Object.keys(fe).length) focusFirstError();
      },
    });
  }

  const abandon = useMutation({
    mutationFn: () => api(`/memberships/requests/${draft!.id}/withdraw`, { method: 'POST', auth: false, headers: codeHeader(draft!) }),
    onSuccess: () => { clearDraft(); qc.removeQueries({ queryKey: ['request'] }); navigate('/adhesion', { replace: true }); },
    onError: (e) => { setConfirmAbandon(false); setBanner({ kind: 'error', title: 'Abandon impossible', text: e.message }); },
  });

  const ctx = useMemo(() => ({ values, errors, set, specs, options: options ?? null }), [values, errors, specs, options]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Affichages particuliers ──
  if (submitted) return <SubmittedView done={submitted} />;
  if (reqs.isLoading || (draft && view.isLoading)) return <div className="container"><Spinner label="Chargement de votre demande…" /></div>;
  if (reqs.isError || !reqs.data) return <div className="container"><Alert kind="error" title="Chargement impossible">{reqs.error?.message}</Alert></div>;
  if (!reqs.data.category.isOpen) return <div className="container container--narrow stack"><h1>Demandes fermées</h1><p>Les demandes de cette catégorie ne sont pas ouvertes pour le moment.</p><LinkButton to="/adhesion" variant="secondary">Retour</LinkButton></div>;
  if (draft && view.isError) {
    return (
      <div className="container container--narrow stack">
        <h1>Demande introuvable</h1>
        <p>Ce brouillon n’est plus disponible (il est effacé après 30 jours sans modification) ou le lien est incorrect.</p>
        <div className="row"><Button onClick={() => { clearDraft(); setDraft(null); view.refetch(); }}>Commencer une nouvelle demande</Button><LinkButton to="/adhesion/suivi" variant="secondary">Suivre un dossier déposé</LinkButton></div>
      </div>
    );
  }
  if (view.data && !view.data.canEdit) {
    return (
      <div className="container container--narrow stack">
        <h1>Dossier déposé</h1>
        <Alert kind="info" title={view.data.reference ? `Référence ${view.data.reference}` : 'Dossier déposé'}>Ce dossier n’est plus modifiable : {view.data.statusLabel.toLowerCase()}.</Alert>
        <div className="row"><LinkButton to="/adhesion/suivi">Suivre mon dossier</LinkButton><Button variant="secondary" onClick={() => { clearDraft(); setDraft(null); loadedFor.current = null; setValues({ requestType: 'FIRST' }); }}>Commencer une autre demande</Button></div>
      </div>
    );
  }

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const rejected = view.data?.documents.filter((d) => d.status === 'REJECTED') ?? [];
  const toComplete = view.data?.status === 'TO_COMPLETE';

  return (
    <FormCtx.Provider value={ctx}>
      <div className="container container--wide stack">
        <div className="page-head">
          <h1>Demande d’adhésion</h1>
          <p>{reqs.data.category.label}. Les champs marqués d’une étoile (*) sont obligatoires.</p>
        </div>

        <nav aria-label="Progression de la demande">
          <p className="stepper__summary">Étape {step + 1} sur {STEPS.length} : {cur.short}</p>
          <ol className="stepper">
            {STEPS.map((s, i) => {
              const state = i < step ? 'done' : i === step ? 'current' : 'todo';
              return (
                <li key={s.id}>
                  <button type="button" className="stepper__btn" data-state={state} aria-current={i === step ? 'step' : undefined}
                    disabled={state === 'todo' || save.isPending} onClick={() => state === 'done' && goTo(i)}>
                    <span>Étape {i + 1}{state === 'done' && <span className="sr-only"> (terminée)</span>}</span>
                    <span>{s.short}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {newCode && (
          <section className="panel panel--soft" aria-labelledby="code-titre">
            <h2 id="code-titre" className="panel__title">Conservez votre code de suivi</h2>
            <p>Votre demande est commencée. Ce code personnel est aussi envoyé par e-mail : il permet de reprendre et de suivre votre dossier.</p>
            <p className="code-box" tabIndex={0}>{newCode}</p>
            <Button variant="secondary" onClick={() => setNewCode(null)}>J’ai noté mon code</Button>
          </section>
        )}
        {toComplete && <Alert kind="info" title="Des compléments sont demandés">Corrigez ou ajoutez ce que la CAPH-CI a demandé, puis déposez de nouveau votre dossier à la dernière étape.</Alert>}
        {rejected.length > 0 && <Alert kind="error" title="Des pièces sont à remplacer">{rejected.map((d) => `${d.label}${d.reviewNote ? ` : ${d.reviewNote}` : ''}`).join(' — ')}</Alert>}

        <section className="panel" aria-labelledby="titre-etape" ref={formRef as never}>
          <h2 id="titre-etape" className="panel__title" tabIndex={-1} ref={heading}>Étape {step + 1} sur {STEPS.length} : {cur.title}</h2>
          {banner && <Alert ref={bannerRef} kind={banner.kind} title={banner.title}>{banner.text}</Alert>}

          {cur.id === 'demandeur' && <ApplicantStep locked={!!draft} />}
          {cur.id === 'organisation' && <FieldsStep paths={STEP_FIELDS.organisation} hints={{ 'organization.legalReference': 'Le numéro figurant sur votre récépissé de déclaration.', 'organization.name': 'Exactement comme sur vos statuts.' }} />}
          {cur.id === 'activites' && <ActivitiesStep />}
          {cur.id === 'representant' && <FieldsStep paths={STEP_FIELDS.representant} intro="La personne habilitée à engager votre organisation auprès de la CAPH-CI." />}
          {cur.id === 'responsables' && <FieldsStep paths={STEP_FIELDS.responsables} sections={{ secretaryGeneral: 'Secrétaire général', treasurer: 'Trésorier ou responsable financier' }} />}
          {cur.id === 'pieces' && draft && view.data && <DocumentsStep draft={draft} view={view.data} onChanged={(v) => qc.setQueryData(['request', draft.id], v)} />}
          {cur.id === 'recapitulatif' && draft && view.data && reqs.data && (
            <RecapStep draft={draft} view={view.data} reqs={reqs.data} onGoTo={goTo} onSubmitted={(s) => { clearDraft(); setSubmitted(s); window.scrollTo?.({ top: 0 }); }} />
          )}

          {!isLast && (
            <div className="wizard-nav">
              <div className="wizard-nav__main">
                {step > 0 && <Button variant="secondary" onClick={() => goTo(step - 1)} disabled={save.isPending}>Retour</Button>}
                {cur.id !== 'pieces' && <Button variant="ghost" onClick={() => saveAndGo()} loading={save.isPending && save.variables === step}>Enregistrer sans continuer</Button>}
              </div>
              <Button onClick={() => (cur.id === 'pieces' ? goTo(step + 1) : saveAndGo(step + 1))} loading={save.isPending}>
                {cur.id === 'pieces' ? 'Continuer' : cur.id === 'demandeur' && !draft ? 'Commencer ma demande' : 'Enregistrer et continuer'}
              </Button>
            </div>
          )}
          {isLast && step > 0 && <div className="wizard-nav"><Button variant="secondary" onClick={() => goTo(step - 1)}>Retour</Button></div>}
        </section>

        {draft && (
          <section aria-label="Abandonner la demande">
            {!confirmAbandon
              ? <Button variant="ghost" onClick={() => setConfirmAbandon(true)}>Abandonner cette demande</Button>
              : (
                <div className="confirm" role="group" aria-label="Confirmer l’abandon">
                  <p><strong>Abandonner cette demande ?</strong> Ce que vous avez saisi sera effacé.</p>
                  <div className="row">
                    <Button variant="danger" loading={abandon.isPending} onClick={() => abandon.mutate()}>Oui, abandonner</Button>
                    <Button variant="secondary" onClick={() => setConfirmAbandon(false)}>Non, continuer</Button>
                  </div>
                </div>
              )}
          </section>
        )}
        <p><Link to="/adhesion">Retour à la page d’adhésion</Link></p>
      </div>
    </FormCtx.Provider>
  );
}

function SubmittedView({ done }: { done: Submitted }) {
  usePageTitle('Dossier déposé');
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="container container--narrow stack">
      <h1 tabIndex={-1} ref={ref}>Votre dossier est bien reçu</h1>
      <Alert kind="success" title="Dossier déposé">Un e-mail de confirmation vient d’être envoyé. La réception ne vaut pas admission : votre dossier va être examiné par les instances compétentes de la CAPH-CI.</Alert>
      <section className="panel" aria-labelledby="ref-titre">
        <h2 id="ref-titre" className="panel__title">À conserver</h2>
        <p>Référence de votre dossier :</p>
        <p className="reference">{done.reference}</p>
        <p>Code de suivi :</p>
        <p className="code-box" tabIndex={0}>{done.code}</p>
        <p className="item__meta">Ces deux informations, avec votre adresse e-mail, permettent de suivre votre dossier. Elles sont aussi dans l’e-mail reçu.</p>
      </section>
      <div className="row"><LinkButton to="/adhesion/suivi">Suivre mon dossier</LinkButton><LinkButton to="/" variant="secondary">Retour à l’accueil</LinkButton></div>
    </div>
  );
}

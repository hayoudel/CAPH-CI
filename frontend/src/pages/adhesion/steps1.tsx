import { createContext, useContext, type ReactNode } from 'react';
import type { FieldSpecs, MembershipRequirements } from '../../api/types';
import { CheckGroup, RadioGroup, SelectField, TextField } from '../../ui/Field';

export type Values = Record<string, string | string[]>;
interface Ctx {
  values: Values; errors: Record<string, string>; set: (k: string, v: string | string[]) => void;
  specs: FieldSpecs | null; options: MembershipRequirements['options'] | null;
}
export const FormCtx = createContext<Ctx>({ values: {}, errors: {}, set: () => undefined, specs: null, options: null });
const useForm = () => useContext(FormCtx);
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

const INPUT_TYPE = { text: 'text', email: 'email', phone: 'tel', url: 'url' } as const;

/** Un champ du formulaire, décrit par la définition du serveur (libellé, type, obligatoire). */
function Field({ path, hint }: { path: string; hint?: ReactNode }) {
  const { values, errors, set, specs, options } = useForm();
  const [section, key] = path.split('.');
  const spec = specs?.[section]?.[key];
  if (!spec) return null;
  if (spec.type === 'uuid') {
    return (
      <SelectField label={spec.label} required={spec.required} value={str(values[path])} error={errors[path]} hint={hint} placeholder="Choisir dans la liste"
        options={(options?.regions ?? []).map((r) => ({ value: r.id, label: r.name }))} onChange={(e) => set(path, e.target.value)} />
    );
  }
  if (spec.type === 'uuidList') return null;
  const t = INPUT_TYPE[spec.type];
  return (
    <TextField label={spec.label} required={spec.required} type={t} inputMode={t === 'tel' ? 'tel' : t === 'email' ? 'email' : undefined}
      value={str(values[path])} error={errors[path]} hint={hint} maxLength={spec.max} onChange={(e) => set(path, e.target.value)} />
  );
}

/** Étapes faites de simples champs : on les affiche dans l'ordre, éventuellement groupés par section. */
export function FieldsStep({ paths, hints = {}, intro, sections }: { paths: string[]; hints?: Record<string, ReactNode>; intro?: string; sections?: Record<string, string> }) {
  const bySection = paths.reduce<Record<string, string[]>>((acc, p) => { (acc[p.split('.')[0]] ??= []).push(p); return acc; }, {});
  return (
    <>
      {intro && <p className="muted">{intro}</p>}
      {Object.entries(bySection).map(([section, list]) => (
        <div key={section}>
          {sections?.[section] && <h3>{sections[section]}</h3>}
          <div className="form-grid">{list.map((p) => <Field key={p} path={p} hint={hints[p]} />)}</div>
        </div>
      ))}
    </>
  );
}

export function ApplicantStep({ locked }: { locked: boolean }) {
  const { values, errors, set } = useForm();
  const renewal = values.requestType === 'RENEWAL';
  return (
    <>
      <p className="muted">La personne qui remplit cette demande. Elle recevra le code de suivi et les messages de la CAPH-CI.</p>
      <RadioGroup legend="Type de demande" value={str(values.requestType) || 'FIRST'} onChange={(v) => set('requestType', v)}
        options={[
          { value: 'FIRST', label: 'Première adhésion', hint: 'Votre organisation n’est pas encore membre de la CAPH-CI.' },
          { value: 'RENEWAL', label: 'Renouvellement', hint: 'Votre organisation est déjà membre.' },
        ]} />
      {renewal && <TextField label="Numéro de membre actuel" required value={str(values.existingMemberNumber)} error={errors.existingMemberNumber} hint="Exemple : OPH-0042" onChange={(e) => set('existingMemberNumber', e.target.value)} />}
      <div className="form-grid">
        <TextField label="Nom et prénom" required autoComplete="name" value={str(values.applicantName)} error={errors.applicantName} onChange={(e) => set('applicantName', e.target.value)} />
        <TextField label="Adresse e-mail" type="email" required autoComplete="email" inputMode="email" value={str(values.applicantEmail)} error={errors.applicantEmail}
          readOnly={locked} hint={locked ? 'Cette adresse ne peut plus être modifiée.' : 'Le code de suivi y sera envoyé.'} onChange={(e) => set('applicantEmail', e.target.value)} />
        <TextField label="Téléphone" type="tel" inputMode="tel" autoComplete="tel" value={str(values.applicantPhone)} error={errors.applicantPhone} hint="Facultatif" onChange={(e) => set('applicantPhone', e.target.value)} />
      </div>
    </>
  );
}

export function ActivitiesStep() {
  const { values, errors, set, specs, options } = useForm();
  const delegationId = str(values.delegationId);
  const regionId = str(values['organization.regionId']);
  const delegations = options?.delegations ?? [];
  const chosen = delegations.find((d) => d.id === delegationId);
  const sameRegion = (d: { regionId: string | null }) => !regionId || d.regionId === regionId;
  const list = [...delegations].sort((a, b) => Number(sameRegion(b)) - Number(sameRegion(a)) || a.name.localeCompare(b.name, 'fr'));
  const mismatch = !!chosen && !!regionId && chosen.regionId !== regionId;
  return (
    <>
      <CheckGroup legend={specs?.organization?.interventionDomainIds?.label ?? 'Domaines d’intervention'} required hint="Cochez tout ce qui s’applique."
        items={options?.domains ?? []} selected={(values['organization.interventionDomainIds'] as string[]) ?? []} error={errors['organization.interventionDomainIds']}
        onChange={(v) => set('organization.interventionDomainIds', v)} />
      <CheckGroup legend="Types de handicap concernés" hint="Facultatif."
        items={options?.disabilityTypes ?? []} selected={(values['organization.disabilityTypeIds'] as string[]) ?? []} error={errors['organization.disabilityTypeIds']}
        onChange={(v) => set('organization.disabilityTypeIds', v)} />
      <div className="form-grid">
        <TextField label="Zone d’intervention" required value={str(values['organization.interventionZone'])} error={errors['organization.interventionZone']}
          hint="Exemple : District d’Abidjan et Sud-Comoé" onChange={(e) => set('organization.interventionZone', e.target.value)} />
        <SelectField label="Délégation territoriale souhaitée" required value={delegationId} error={errors.delegationId} placeholder="Choisir une délégation"
          hint={regionId ? 'Les délégations de votre région sont proposées en premier.' : 'Choisissez d’abord votre région à l’étape précédente pour un classement plus utile.'}
          options={list.map((d) => ({ value: d.id, label: sameRegion(d) ? d.name : `${d.name} (autre région)` }))} onChange={(e) => set('delegationId', e.target.value)} />
      </div>
      {mismatch && (
        <TextField label="Pourquoi cette délégation ?" value={str(values.delegationOverrideReason)} error={errors.delegationOverrideReason} maxLength={500}
          hint="Cette délégation n’est pas dans votre région : expliquez brièvement votre choix." onChange={(e) => set('delegationOverrideReason', e.target.value)} />
      )}
    </>
  );
}

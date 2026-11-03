import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import type React from 'react';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string;
}

/** Libellé visible, aide et erreur reliés au champ (aria-describedby) ; jamais de placeholder en guise de libellé. */
export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField({ label, hint, error, required, type = 'text', ...rest }, ref) {
  const id = useId();
  const hintId = `${id}-hint`, errId = `${id}-err`;
  const describedBy = [hint ? hintId : '', error ? errId : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}{required && <span className="field__req" aria-hidden="true"> *</span>}
        {required && <span className="sr-only"> (obligatoire)</span>}
      </label>
      <input ref={ref} id={id} className="input" type={type} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest} />
      {hint && <div className="field__hint" id={hintId}>{hint}</div>}
      {error && <p className="field__error" id={errId}>{error}</p>}
    </div>
  );
});

/** Mot de passe avec bouton « Afficher » : utile à tous, indispensable pour les saisies difficiles. */
export const PasswordField = forwardRef<HTMLInputElement, FieldProps>(function PasswordField({ label, hint, error, required, ...rest }, ref) {
  const id = useId();
  const hintId = `${id}-hint`, errId = `${id}-err`;
  const [shown, setShown] = useState(false);
  const describedBy = [hint ? hintId : '', error ? errId : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}{required && <span className="field__req" aria-hidden="true"> *</span>}
        {required && <span className="sr-only"> (obligatoire)</span>}
      </label>
      <div className="input-group">
        <input ref={ref} id={id} className="input" type={shown ? 'text' : 'password'} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest} />
        <button type="button" className="input-group__toggle" onClick={() => setShown((s) => !s)} aria-pressed={shown}>
          {shown ? 'Masquer' : 'Afficher'}<span className="sr-only"> le mot de passe</span>
        </button>
      </div>
      {hint && <div className="field__hint" id={hintId}>{hint}</div>}
      {error && <p className="field__error" id={errId}>{error}</p>}
    </div>
  );
});

export function Checkbox({ label, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> & { label: string }) {
  const id = useId();
  return (
    <label className="check" htmlFor={id}>
      <input id={id} type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string; hint?: ReactNode; error?: string; options: { value: string; label: string }[]; placeholder?: string;
}
export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(function SelectField({ label, hint, error, options, placeholder, required, ...rest }, ref) {
  const id = useId();
  const hintId = `${id}-hint`, errId = `${id}-err`;
  const describedBy = [hint ? hintId : '', error ? errId : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}{required && <span className="field__req" aria-hidden="true"> *</span>}
        {required && <span className="sr-only"> (obligatoire)</span>}
      </label>
      <select ref={ref} id={id} className="input select" required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <div className="field__hint" id={hintId}>{hint}</div>}
      {error && <p className="field__error" id={errId}>{error}</p>}
    </div>
  );
});

/** Groupe de cases à cocher : un <fieldset> avec légende, lu comme un groupe par les lecteurs d'écran. */
export function CheckGroup({ legend, hint, items, selected, onChange, disabled }: {
  legend: string; hint?: ReactNode; items: { id: string; label: string }[]; selected: string[];
  onChange: (ids: string[]) => void; disabled?: boolean;
}) {
  return (
    <fieldset className="fieldset">
      <legend className="field__label">{legend}</legend>
      {hint && <div className="field__hint">{hint}</div>}
      <div className="check-grid">
        {items.map((i) => (
          <Checkbox key={i.id} label={i.label} disabled={disabled} checked={selected.includes(i.id)}
            onChange={(e) => onChange(e.target.checked ? [...selected, i.id] : selected.filter((x) => x !== i.id))} />
        ))}
      </div>
    </fieldset>
  );
}

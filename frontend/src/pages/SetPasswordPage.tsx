import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { usePageTitle } from '../lib/usePageTitle';
import { Alert } from '../ui/Alert';
import { Button, LinkButton } from '../ui/Button';
import { PasswordField } from '../ui/Field';

export const PASSWORD_RULES = [
  { id: 'len', label: 'Au moins 12 caractères', test: (p: string) => p.length >= 12 },
  { id: 'up', label: 'Une lettre majuscule', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'low', label: 'Une lettre minuscule', test: (p: string) => /[a-z]/.test(p) },
  { id: 'num', label: 'Un chiffre', test: (p: string) => /\d/.test(p) },
  { id: 'sym', label: 'Un caractère spécial (par exemple ! ? # -)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const TEXTS = {
  reset: { title: 'Choisir un nouveau mot de passe', path: '/auth/reset-password', cta: 'Enregistrer le mot de passe', done: 'Votre mot de passe est enregistré. Vous pouvez maintenant vous connecter.' },
  invite: { title: 'Activer votre compte', path: '/auth/accept-invitation', cta: 'Activer mon compte', done: 'Votre compte est activé. Vous pouvez maintenant vous connecter.' },
} as const;

/** Réinitialisation (lien « mot de passe oublié ») et activation (lien d'invitation) : même formulaire, textes différents. */
export function SetPasswordPage({ mode }: { mode: keyof typeof TEXTS }) {
  const t = TEXTS[mode];
  usePageTitle(t.title);
  const token = useSearchParams()[0].get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <>
        <h1>{t.title}</h1>
        <Alert kind="error" title="Lien incomplet">Ce lien est incomplet. Ouvrez-le depuis le message reçu par e-mail, ou demandez-en un nouveau.</Alert>
        <Link to="/mot-de-passe-oublie">Demander un nouveau lien</Link>
      </>
    );
  }
  if (done) {
    return (
      <>
        <h1>C’est fait</h1>
        <Alert kind="success">{t.done}</Alert>
        <LinkButton to="/connexion">Se connecter</LinkButton>
      </>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (PASSWORD_RULES.some((r) => !r.test(password))) next.password = 'Ce mot de passe ne respecte pas encore toutes les règles ci-dessous.';
    if (confirm !== password) next.confirm = 'Les deux mots de passe ne sont pas identiques.';
    setErrors(next);
    setFormError(null);
    if (next.password || next.confirm) return;
    setBusy(true);
    try {
      await api(t.path, { method: 'POST', auth: false, body: { token, newPassword: password } });
      setDone(true);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Enregistrement impossible pour le moment. Réessayez.');
    } finally { setBusy(false); }
  }

  return (
    <>
      <h1>{t.title}</h1>
      {formError && <Alert kind="error" title="Enregistrement impossible">
        {formError} <Link to="/mot-de-passe-oublie">Demander un nouveau lien</Link>
      </Alert>}
      <form onSubmit={submit} noValidate>
        <PasswordField label="Nouveau mot de passe" autoComplete="new-password" required value={password}
          onChange={(e) => setPassword(e.target.value)} error={errors.password}
          hint="Choisissez un mot de passe que vous n’utilisez nulle part ailleurs." />
        <ul className="plain-list" aria-label="Règles du mot de passe" style={{ marginBottom: '1.5rem' }}>
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(password);
            return <li key={r.id} style={{ padding: '0.15rem 0', border: 0 }}>
              <span aria-hidden="true">{ok ? '✓' : '○'}</span> {r.label}<span className="sr-only">{ok ? ' : respecté' : ' : à respecter'}</span>
            </li>;
          })}
        </ul>
        <PasswordField label="Confirmer le mot de passe" autoComplete="new-password" required value={confirm}
          onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        <Button type="submit" block loading={busy}>{t.cta}</Button>
      </form>
    </>
  );
}

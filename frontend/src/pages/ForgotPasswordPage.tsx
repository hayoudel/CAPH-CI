import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { usePageTitle } from '../lib/usePageTitle';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ForgotPasswordPage() {
  usePageTitle('Mot de passe oublié');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) { setError('Saisissez une adresse e-mail valide. Exemple : nom@association.ci'); return; }
    setError(undefined);
    setBusy(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', auth: false, body: { email: email.trim() } });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible pour le moment. Réessayez.');
    } finally { setBusy(false); }
  }

  if (sent) {
    return (
      <>
        <h1>Vérifiez votre messagerie</h1>
        <Alert kind="success" title="Demande prise en compte">
          Si un compte existe avec l’adresse <strong>{email.trim()}</strong>, un message contenant un lien de réinitialisation vient de lui être envoyé.
        </Alert>
        <p>Pensez à regarder dans vos courriers indésirables. Le lien ne fonctionne qu’une seule fois.</p>
        <Link to="/connexion">Retour à la connexion</Link>
      </>
    );
  }
  return (
    <>
      <h1>Mot de passe oublié</h1>
      <p className="muted">Indiquez l’adresse e-mail de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
      <form onSubmit={submit} noValidate>
        <TextField label="Adresse e-mail" type="email" autoComplete="username" inputMode="email" required
          value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
        <Button type="submit" block loading={busy}>Envoyer le lien</Button>
      </form>
      <div className="link-row"><Link to="/connexion">Retour à la connexion</Link></div>
    </>
  );
}

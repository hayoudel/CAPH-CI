import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { homePathFor, useAuth } from '../auth/AuthContext';
import { usePageTitle } from '../lib/usePageTitle';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Checkbox, PasswordField, TextField } from '../ui/Field';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function LoginPage() {
  usePageTitle('Connexion');
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (formError) alertRef.current?.focus(); }, [formError]);

  if (user && !busy) return <Navigate to={from ?? homePathFor(user)} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Saisissez votre adresse e-mail.';
    else if (!EMAIL.test(email.trim())) next.email = 'Cette adresse e-mail n’est pas valide. Exemple : nom@association.ci';
    if (!password) next.password = 'Saisissez votre mot de passe.';
    setErrors(next);
    setFormError(null);
    if (next.email) { emailRef.current?.focus(); return; }
    if (next.password) { passwordRef.current?.focus(); return; }

    setBusy(true);
    try {
      const u = await login(email.trim(), password, remember);
      navigate(from ?? homePathFor(u), { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Connexion impossible pour le moment. Réessayez.');
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Se connecter</h1>
      <p className="muted">Utilisez l’adresse e-mail de votre compte.</p>
      {formError && <Alert ref={alertRef} kind="error" title="Connexion impossible">{formError}</Alert>}
      <form onSubmit={submit} noValidate>
        <TextField ref={emailRef} label="Adresse e-mail" type="email" autoComplete="username" inputMode="email" required
          value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <PasswordField ref={passwordRef} label="Mot de passe" autoComplete="current-password" required
          value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <Checkbox label="Rester connecté(e) pendant 30 jours sur cet appareil" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <Button type="submit" block loading={busy}>{busy ? 'Connexion…' : 'Se connecter'}</Button>
      </form>
      <div className="link-row">
        <Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
        <Link to="/adhesion">Pas encore membre ?</Link>
      </div>
    </>
  );
}

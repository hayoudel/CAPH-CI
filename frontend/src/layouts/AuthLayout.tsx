import { useRef } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useFocusOnNavigate } from '../lib/useFocusOnNavigate';
import { BackLink } from '../ui/BackLink';
import { site } from '../lib/site';

/** Pages d'accès (connexion, mot de passe) : un volet d'identité, un volet de saisie. */
export function AuthLayout() {
  const main = useRef<HTMLElement>(null);
  useFocusOnNavigate(main);
  return (
    <div className="auth">
      <a className="skip-link" href="#contenu">Aller au contenu</a>
      <aside className="auth__aside on-dark">
        <Link to="/" aria-label={`${site.name} — retour à l'accueil`}>
          <img className="auth__logo" src="/logo.png" alt="Logo de la CAPH-CI" width="320" height="265" />
        </Link>
        <div>
          <p className="auth__headline">L’espace des organisations membres</p>
          <p>Suivez votre adhésion, échangez avec la Coordination et retrouvez les informations utiles à votre association.</p>
        </div>
        <span className="tricolor" aria-hidden="true" />
      </aside>
      <main id="contenu" ref={main} tabIndex={-1} className="auth__main">
        <div className="auth__back"><BackLink fallback="/" /><Link to="/">Aller au site</Link></div>
        <div className="auth__panel"><Outlet /></div>
      </main>
    </div>
  );
}

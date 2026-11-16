import { useRef } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { homePathFor, useAuth } from '../auth/AuthContext';
import { useFocusOnNavigate } from '../lib/useFocusOnNavigate';
import { site } from '../lib/site';
import { LinkButton } from '../ui/Button';
import { BackLink } from '../ui/BackLink';
import { Footer } from './Footer';

export function PublicLayout() {
  const main = useRef<HTMLElement>(null);
  const { user } = useAuth();
  useFocusOnNavigate(main);
  return (
    <>
      <a className="skip-link" href="#contenu">Aller au contenu</a>
      <header className="site-header on-dark">
        <div className="site-header__bar">
          <Link to="/" className="brand">
            <img src="/logo.png" alt="" width="120" height="100" />
            <span className="brand__text">{site.name}<small>Espace numérique des organisations</small></span>
          </Link>
          <nav className="site-nav" aria-label="Accès rapide">
            {user
              ? <LinkButton to={homePathFor(user)} variant="secondary">Mon espace</LinkButton>
              : <LinkButton to="/connexion" variant="secondary">Se connecter</LinkButton>}
          </nav>
        </div>
        <span className="tricolor" aria-hidden="true" />
      </header>
      <main id="contenu" ref={main} tabIndex={-1} className="site-main">
        <div className="back-bar"><BackLink fallback="/" /></div>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useFocusOnNavigate } from '../lib/useFocusOnNavigate';
import { Button } from '../ui/Button';

interface NavItem { to: string; label: string; end?: boolean }

/** Espace connecté. Le menu s'enrichira à chaque lot : ici seules les pages existantes sont listées. */
function navFor(area: 'member' | 'staff'): NavItem[] {
  return area === 'member'
    ? [
        { to: '/espace', label: 'Tableau de bord', end: true },
        { to: '/espace/organisation', label: 'Mon organisation' },
        { to: '/espace/equipe', label: 'Mon équipe' },
        { to: '/espace/annuaire', label: 'Annuaire public' },
      ]
    : [
        { to: '/admin', label: 'Tableau de bord', end: true },
      ];
}

export function AppShell({ area }: { area: 'member' | 'staff' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const main = useRef<HTMLElement>(null);
  useFocusOnNavigate(main);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function signOut() {
    await logout();
    navigate('/connexion', { replace: true });
  }

  const who = user ? `${user.firstName} ${user.lastName}` : '';
  const context = area === 'member' ? user?.organizationName : 'Personnel CAPH-CI';

  return (
    <div className="shell">
      <a className="skip-link" href="#contenu">Aller au contenu</a>

      <div className="shell__top on-dark">
        <img src="/logo.png" alt="CAPH-CI" width="120" height="100" />
        <Button variant="ghost" className="menu-btn" aria-expanded={open} aria-controls="menu-principal" onClick={() => setOpen((o) => !o)}>
          {open ? 'Fermer' : 'Menu'}
        </Button>
      </div>
      {open && <button type="button" className="shell__scrim" aria-label="Fermer le menu" onClick={() => setOpen(false)} />}

      <div id="menu-principal" className="shell__side on-dark" data-open={open}>
        <div className="shell__brand">
          <img src="/logo.png" alt="Logo de la CAPH-CI" width="144" height="120" />
        </div>
        <span className="tricolor" aria-hidden="true" />
        <nav aria-label="Navigation principale">
          <ul className="nav">
            {navFor(area).map((i) => (
              <li key={i.to}><NavLink to={i.to} end={i.end}>{i.label}</NavLink></li>
            ))}
          </ul>
        </nav>
        <div className="shell__spacer" />
        <div className="shell__side-foot">
          <p style={{ margin: 0 }}><strong>{who}</strong></p>
          <p style={{ margin: '0 0 0.75rem', opacity: 0.9 }}>{context}</p>
          <Button variant="secondary" block onClick={signOut}>Se déconnecter</Button>
        </div>
      </div>

      <main id="contenu" ref={main} tabIndex={-1} className="shell__main">
        <div className="shell__content"><Outlet /></div>
      </main>
    </div>
  );
}

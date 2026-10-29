import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigation, PageName } from '../context/NavigationContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type FontSize = 'sm' | 'base' | 'lg' | 'xl';

export type HeaderProps = {
  fontSize: FontSize;
  onDecrease: () => void;
  onReset: () => void;
  onIncrease: () => void;
  highContrast: boolean;
  onToggleContrast: () => void;
};

type DropdownItem = {
  icon: string;
  label: string;
  desc?: string;
  page: PageName;
};

type NavGroup = {
  id: string;
  label: string;
  page?: PageName;
  items?: DropdownItem[];
};

// ─── Navigation structure ────────────────────────────────────────────────────

const navGroups: NavGroup[] = [
  { id: 'home', label: 'Accueil', page: 'home' },
  { id: 'about', label: 'La CAPH-CI', page: 'about' },
  { id: 'actions', label: 'Nos Actions', page: 'actions' },
  { id: 'projects', label: 'Projets', page: 'projects' },
  { id: 'delegations', label: 'Délégations', page: 'delegations' },
  { id: 'news', label: 'Actualités', page: 'news' },
  { id: 'agenda', label: 'Agenda', page: 'agenda' },
  { id: 'opportunities', label: 'Opportunités', page: 'opportunities' },
  { id: 'media', label: 'Médiathèque', page: 'media' },
  { id: 'resources', label: 'Ressources', page: 'resources' },
  { id: 'contact', label: 'Contact', page: 'contact' },
];

const navGroupsSecondary: NavGroup[] = [];

const ophMenuItems = [
  { icon: '🔐', label: 'Se connecter', page: 'members' as PageName },
  { icon: '📋', label: 'Accéder à mon espace', page: 'members' as PageName },
];

// ─── Pages → groupe parent (pour surbrillance active) ────────────────────────

const pageParent: Partial<Record<PageName, string>> = {
  mission: 'about',
  gouvernance: 'about',
  delegations: 'delegations',
  'delegation-detail': 'delegations',
  oph: 'about',
  'oph-detail': 'about',
  cabinet: 'about',
  devis: 'about',
  actions: 'actions',
  'action-detail': 'actions',
  projects: 'projects',
  'project-detail': 'projects',
  transparency: 'transparency',
  news: 'news',
  'news-detail': 'news',
  agenda: 'agenda',
  media: 'media',
  members: 'home',
  opportunities: 'opportunities',
  'opportunity-detail': 'opportunities',
  resources: 'resources',
  'resource-detail': 'resources',
  contact: 'contact',
  adhesion: 'home',
  'adhesion-form': 'home',
  'adhesion-confirm': 'home',
};

function activeGroup(current: PageName): string {
  if (current === 'home') return 'home';
  return pageParent[current] ?? current;
}

// ─── Dropdown component ───────────────────────────────────────────────────────

function Dropdown({
  group,
  isOpen,
  onOpen,
  onClose,
}: {
  group: NavGroup;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { currentPage, navigate } = useNavigation();
  const active = activeGroup(currentPage);
  const isGroupActive = active === group.id;
  const ref = useRef<HTMLDivElement>(null);

  if (!group.items) {
    return (
      <button
        onClick={() => { navigate(group.page!); onClose(); }}
        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold min-h-11 transition-colors whitespace-nowrap ${
          isGroupActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
        }`}
        aria-current={isGroupActive ? 'page' : undefined}
      >
        {group.label}
      </button>
    );
  }

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <button
        onClick={isOpen ? onClose : onOpen}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold min-h-11 transition-colors whitespace-nowrap ${
          isGroupActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
        }`}
      >
        {group.label}
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50"
          role="menu"
        >
          {group.items.map(item => {
            const itemActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => { navigate(item.page); onClose(); }}
                role="menuitem"
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                  itemActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <span className="text-lg flex-shrink-0 mt-0.5" aria-hidden="true">{item.icon}</span>
                <div>
                  <div className={`text-sm font-semibold ${itemActive ? 'text-blue-600' : 'text-slate-900'}`}>{item.label}</div>
                  {item.desc && <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── OPH Dropdown ────────────────────────────────────────────────────────────

function OphDropdown({ isOpen, onOpen, onClose }: { isOpen: boolean; onOpen: () => void; onClose: () => void }) {
  const { navigate } = useNavigation();
  return (
    <div className="relative" onMouseEnter={onOpen} onMouseLeave={onClose}>
      <button
        onClick={isOpen ? onClose : onOpen}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold min-h-11 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200 whitespace-nowrap"
      >
        <span aria-hidden="true">🔑</span>
        Espace membres
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50" role="menu">
          {ophMenuItems.map(item => (
            <button
              key={item.label}
              onClick={() => { navigate(item.page); onClose(); }}
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Header ─────────────────────────────────────────────────────────────

export default function Header({ fontSize, onDecrease, onReset, onIncrease, highContrast, onToggleContrast }: HeaderProps) {
  const { currentPage, navigate } = useNavigation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [ophOpen, setOphOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  const close = useCallback(() => { setOpenGroup(null); setOphOpen(false); }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('header')) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [close]);

  // Close mobile menu on navigate
  useEffect(() => { setMobileOpen(false); setMobileExpanded(null); }, [currentPage]);

  const fontLabel: Record<FontSize, string> = { sm: '90%', base: '100%', lg: '150%', xl: '200%' };

  return (
    <header role="banner" className="sticky top-0 z-50">
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="bg-[#1A1A1A] text-white" role="toolbar" aria-label="Outils d'accessibilité">
        <div className="max-w-[1440px] mx-auto px-3 flex items-center justify-between h-9">
          <span className="text-slate-400 text-xs hidden sm:block">Portail national — CAPH-CI</span>

          <div className="flex items-center gap-1 ml-auto">
            {/* Text size controls */}
            <button
              onClick={onDecrease}
              disabled={fontSize === 'sm'}
              className="px-2 py-0.5 rounded hover:bg-slate-700 transition-colors text-xs font-bold disabled:opacity-40"
              aria-label="Réduire la taille du texte"
            >A−</button>
            <button
              onClick={onReset}
              disabled={fontSize === 'base'}
              className={`px-2 py-0.5 rounded transition-colors text-xs font-mono ${fontSize === 'base' ? 'text-slate-500 cursor-default' : 'hover:bg-slate-700 text-slate-300'}`}
              aria-label="Réinitialiser la taille du texte"
            >{fontLabel[fontSize]}</button>
            <button
              onClick={onIncrease}
              disabled={fontSize === 'xl'}
              className="px-2 py-0.5 rounded hover:bg-slate-700 transition-colors text-sm font-bold disabled:opacity-40"
              aria-label="Augmenter la taille du texte"
            >A+</button>

            <div className="w-px h-4 bg-slate-700 mx-1.5" aria-hidden="true" />

            {/* Contrast */}
            <button
              onClick={onToggleContrast}
              aria-pressed={highContrast}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${highContrast ? 'bg-white text-slate-900 font-semibold' : 'hover:bg-slate-700 text-slate-300'}`}
              aria-label="Basculer le contraste élevé"
            >Contraste</button>

            <div className="w-px h-4 bg-slate-700 mx-1.5" aria-hidden="true" />

            {/* Lecture (text-to-speech) */}
            <button
              onClick={() => window.speechSynthesis?.cancel()}
              className="px-2 py-0.5 rounded hover:bg-slate-700 text-slate-300 text-xs transition-colors flex items-center gap-1"
              aria-label="Lecture audio de la page"
              title="Lecture"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.784L4.17 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.17l4.213-3.784a1 1 0 011 .076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
              Lecture
            </button>

            <div className="w-px h-4 bg-slate-700 mx-1.5" aria-hidden="true" />

            {/* Language */}
            <span className="text-white text-xs font-semibold">FR</span>
            <span className="text-slate-600 text-xs mx-0.5">|</span>
            <button className="text-slate-400 hover:text-white text-xs transition-colors">EN</button>
          </div>
        </div>
      </div>

      {/* ── Main navbar ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-3">
          <div className="flex flex-wrap items-center min-h-16 gap-2 py-2">

            {/* Logo */}
            <button
              onClick={() => navigate('home')}
              className="flex w-16 items-center justify-center flex-shrink-0 focus-visible:rounded-lg"
              aria-label="CAPH-CI — Accueil"
            >
              <img src="/logo-caph-ci.png" alt="" className="w-14 h-12 object-contain flex-shrink-0" />
            </button>

            {/* Skip link (accessible) */}
            <a href="#main-content" className="skip-link">Aller au contenu</a>

            {/* Desktop nav */}
            <nav
              className="hidden lg:flex order-3 basis-full items-center justify-center gap-0.5 border-t border-slate-100 pt-2"
              role="navigation"
              aria-label="Navigation principale"
            >
              {navGroups.map(group => (
                <Dropdown
                  key={group.id}
                  group={group}
                  isOpen={openGroup === group.id}
                  onOpen={() => setOpenGroup(group.id)}
                  onClose={() => setOpenGroup(null)}
                />
              ))}
              {navGroupsSecondary.map(group => (
                <Dropdown
                  key={group.id}
                  group={group}
                  isOpen={openGroup === group.id}
                  onOpen={() => setOpenGroup(group.id)}
                  onClose={() => setOpenGroup(null)}
                />
              ))}
            </nav>

            {/* Action zone — desktop */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0 ml-auto">
              <OphDropdown
                isOpen={ophOpen}
                onOpen={() => setOphOpen(true)}
                onClose={() => setOphOpen(false)}
              />
              <div className="w-4" aria-hidden="true" />
              <button
                onClick={() => navigate('partner')}
                className="px-3 py-2 text-sm font-bold min-h-11 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
              >
                Devenir partenaire
              </button>
              <button
                onClick={() => navigate('donate')}
                className="px-3 py-2 text-sm font-bold min-h-11 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Faire un don
              </button>
              <button
                onClick={() => navigate('adhesion')}
                className="px-3 py-2 text-sm font-bold min-h-11 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                Adhérer
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden ml-auto p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ───────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden bg-white border-b border-slate-200 shadow-lg max-h-[80vh] overflow-y-auto"
          role="navigation"
          aria-label="Navigation mobile"
        >
          <div className="max-w-[1440px] mx-auto px-3 py-4 space-y-1">
            {[...navGroups, ...navGroupsSecondary].map(group => {
              const active = activeGroup(currentPage);
              const isActive = active === group.id;

              if (!group.items) {
                return (
                  <button
                    key={group.id}
                    onClick={() => navigate(group.page!)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {group.label}
                  </button>
                );
              }

              const expanded = mobileExpanded === group.id;
              return (
                <div key={group.id}>
                  <button
                    onClick={() => setMobileExpanded(expanded ? null : group.id)}
                    aria-expanded={expanded}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {group.label}
                    <svg
                      className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expanded && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-blue-100 pl-4">
                      {group.items.map(item => (
                        <button
                          key={item.page}
                          onClick={() => navigate(item.page)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                            currentPage === item.page ? 'text-blue-600 font-semibold bg-blue-50' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span aria-hidden="true">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Mobile action buttons */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="flex flex-col gap-1">
                {ophMenuItems.map(item => (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.page)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 text-left"
                  >
                    <span aria-hidden="true">{item.icon}</span>{item.label}
                  </button>
                ))}
              </div>
              <button onClick={() => navigate('partner')} className="w-full py-2.5 rounded-xl text-sm font-semibold border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors">Devenir partenaire</button>
              <button onClick={() => navigate('donate')} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">Faire un don</button>
              <button onClick={() => navigate('adhesion')} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors">Adhérer à la CAPH-CI</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

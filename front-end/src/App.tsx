import { useEffect, useState } from 'react';
import { Outlet, Route, Routes } from 'react-router';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './routes/ScrollToTop';
import ProtectedRoute from './routes/ProtectedRoute';
import { pagePatterns } from './routes/paths';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ActionsPage from './pages/ActionsPage';
import ProjectsPage from './pages/ProjectsPage';
import TransparencyPage from './pages/TransparencyPage';
import DelegationsPage from './pages/DelegationsPage';
import NewsPage from './pages/NewsPage';
import OpportunitiesPage from './pages/OpportunitiesPage';
import OPHPage from './pages/OPHPage';
import ResourcesPage from './pages/ResourcesPage';
import MediaPage from './pages/MediaPage';
import CabinetPage from './pages/CabinetPage';
import PartnerPage from './pages/PartnerPage';
import DonatePage from './pages/DonatePage';
import ContactPage from './pages/ContactPage';
import AgendaPage from './pages/AgendaPage';
import AdhesionPage from './pages/AdhesionPage';
import MembersPage from './pages/MembersPage';
import MemberDashboardPage from './pages/MemberDashboardPage';
import InstitutionalTextPage from './pages/InstitutionalTextPage';
import NotFoundPage from './pages/NotFoundPage';

type FontSize = 'sm' | 'base' | 'lg' | 'xl';
const fontSizeOrder: FontSize[] = ['sm', 'base', 'lg', 'xl'];
const fontSizeClass: Record<FontSize, string> = { sm: 'text-sm-mode', base: '', lg: 'text-lg', xl: 'text-xl' };

/** Gabarit commun : header, contenu (Outlet) et footer. */
function Layout() {
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [highContrast, setHighContrast] = useState(false);

  const shift = (delta: 1 | -1) => {
    const idx = fontSizeOrder.indexOf(fontSize) + delta;
    if (idx >= 0 && idx < fontSizeOrder.length) setFontSize(fontSizeOrder[idx]);
  };

  useEffect(() => {
    document.documentElement.className = [fontSizeClass[fontSize], highContrast ? 'high-contrast' : ''].filter(Boolean).join(' ');
  }, [fontSize, highContrast]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <ScrollToTop />
      <Header
        fontSize={fontSize}
        onDecrease={() => shift(-1)}
        onReset={() => setFontSize('base')}
        onIncrease={() => shift(1)}
        highContrast={highContrast}
        onToggleContrast={() => setHighContrast(c => !c)}
      />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

const p = pagePatterns;

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path={p.home} element={<HomePage />} />
        <Route path={p.about} element={<AboutPage />} />
        <Route path={p.mission} element={<AboutPage initialTab="mission" />} />
        <Route path={p.gouvernance} element={<AboutPage initialTab="gouvernance" />} />
        <Route path={p.actions} element={<ActionsPage />} />
        <Route path={p['action-detail']} element={<ActionsPage detail />} />
        <Route path={p.projects} element={<ProjectsPage />} />
        <Route path={p['project-detail']} element={<ProjectsPage detail />} />
        <Route path={p.delegations} element={<DelegationsPage />} />
        <Route path={p['delegation-detail']} element={<DelegationsPage detail />} />
        <Route path={p.news} element={<NewsPage />} />
        <Route path={p['news-detail']} element={<NewsPage detail />} />
        <Route path={p.agenda} element={<AgendaPage />} />
        <Route path={p['agenda-detail']} element={<AgendaPage />} />
        <Route path={p.opportunities} element={<OpportunitiesPage />} />
        <Route path={p['opportunity-detail']} element={<OpportunitiesPage detail />} />
        <Route path={p.oph} element={<OPHPage />} />
        <Route path={p['oph-detail']} element={<OPHPage detail />} />
        <Route path={p.media} element={<MediaPage />} />
        <Route path={p.resources} element={<ResourcesPage />} />
        <Route path={p['resource-detail']} element={<ResourcesPage detail />} />
        <Route path={p.cabinet} element={<CabinetPage />} />
        <Route path={p.devis} element={<CabinetPage showDevis />} />
        <Route path={p.transparency} element={<TransparencyPage />} />
        <Route path={p.adhesion} element={<AdhesionPage />} />
        <Route path={p['adhesion-form']} element={<AdhesionPage initialStep="form" />} />
        <Route path={p['adhesion-confirm']} element={<AdhesionPage initialStep="confirm" />} />
        <Route path={p.partner} element={<PartnerPage />} />
        <Route path={p['partner-confirm']} element={<PartnerPage confirmed />} />
        <Route path={p.donate} element={<DonatePage />} />
        <Route path={p['donate-confirm']} element={<DonatePage confirmed />} />
        <Route path={p.contact} element={<ContactPage />} />
        <Route path={p.members} element={<MembersPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path={p['members-dashboard']} element={<MemberDashboardPage />} />
        </Route>
        <Route path={p.legal} element={<InstitutionalTextPage kind="legal" />} />
        <Route path={p.privacy} element={<InstitutionalTextPage kind="privacy" />} />
        <Route path={p.accessibility} element={<InstitutionalTextPage kind="accessibility" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth';
import { AppShell } from './layouts/AppShell';
import { AuthLayout } from './layouts/AuthLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { DirectoryDetailPage, DirectoryPage } from './pages/DirectoryPage';
import { AgendaPage } from './pages/content/AgendaPage';
import { CommunicationDetailPage, CommunicationsPage } from './pages/content/CommunicationsPage';
import { DocumentsPage } from './pages/content/DocumentsPage';
import { NewsDetailPage, NewsListPage, NewsNewPage } from './pages/content/NewsPage';
import { ReportDetailPage, ReportNewPage, ReportsPage } from './pages/content/ReportsPage';
import { OpportunitiesPage, OpportunityDetailPage } from './pages/content/OpportunitiesPage';
import { OrganizationPage } from './pages/org/OrganizationPage';
import { TeamPage } from './pages/org/TeamPage';
import { VisibilityPage } from './pages/org/VisibilityPage';
import { AdhesionInfoPage } from './pages/adhesion/AdhesionInfoPage';
import { ResumePage } from './pages/adhesion/ResumePage';
import { TrackPage } from './pages/adhesion/TrackPage';
import { WizardPage } from './pages/adhesion/WizardPage';
import { NotFoundPage } from './pages/ComingSoonPage';
import { MemberDashboardPage, StaffDashboardPage } from './pages/Dashboards';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SetPasswordPage } from './pages/SetPasswordPage';

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="adhesion" element={<AdhesionInfoPage />} />
        <Route path="adhesion/demande" element={<WizardPage />} />
        <Route path="adhesion/reprendre" element={<ResumePage />} />
        <Route path="adhesion/suivi" element={<TrackPage />} />
        <Route path="annuaire" element={<DirectoryPage />} />
        <Route path="annuaire/:id" element={<DirectoryDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="connexion" element={<LoginPage />} />
        <Route path="mot-de-passe-oublie" element={<ForgotPasswordPage />} />
        <Route path="reinitialiser-mot-de-passe" element={<SetPasswordPage mode="reset" />} />
        <Route path="activer-compte" element={<SetPasswordPage mode="invite" />} />
      </Route>

      <Route element={<RequireAuth area="member" />}>
        <Route element={<AppShell area="member" />}>
          <Route path="espace" element={<MemberDashboardPage />} />
          <Route path="espace/organisation" element={<OrganizationPage />} />
          <Route path="espace/equipe" element={<TeamPage />} />
          <Route path="espace/annuaire" element={<VisibilityPage />} />
          <Route path="espace/communications" element={<CommunicationsPage />} />
          <Route path="espace/communications/:id" element={<CommunicationDetailPage />} />
          <Route path="espace/documents" element={<DocumentsPage />} />
          <Route path="espace/opportunites" element={<OpportunitiesPage />} />
          <Route path="espace/opportunites/:id" element={<OpportunityDetailPage />} />
          <Route path="espace/agenda" element={<AgendaPage />} />
          <Route path="espace/rapports" element={<ReportsPage />} />
          <Route path="espace/rapports/nouveau" element={<ReportNewPage />} />
          <Route path="espace/rapports/:id" element={<ReportDetailPage />} />
          <Route path="espace/actualites" element={<NewsListPage />} />
          <Route path="espace/actualites/nouvelle" element={<NewsNewPage />} />
          <Route path="espace/actualites/:id" element={<NewsDetailPage />} />
        </Route>
      </Route>

      <Route element={<RequireAuth area="staff" />}>
        <Route element={<AppShell area="staff" />}>
          <Route path="admin" element={<StaffDashboardPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

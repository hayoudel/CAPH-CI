import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth';
import { AppShell } from './layouts/AppShell';
import { AuthLayout } from './layouts/AuthLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { DirectoryDetailPage, DirectoryPage } from './pages/DirectoryPage';
import { OrganizationPage } from './pages/org/OrganizationPage';
import { TeamPage } from './pages/org/TeamPage';
import { VisibilityPage } from './pages/org/VisibilityPage';
import { ComingSoonPage, NotFoundPage } from './pages/ComingSoonPage';
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
        <Route path="adhesion" element={<ComingSoonPage title="Adhérer à la CAPH-CI" />} />
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

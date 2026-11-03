import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as Auth from '../auth/AuthContext';
import { RequireAuth } from '../auth/RequireAuth';
import { ApiError } from '../api/client';
import { LoginPage } from '../pages/LoginPage';

const ctx = (over: Partial<ReturnType<typeof Auth.useAuth>>) =>
  vi.spyOn(Auth, 'useAuth').mockReturnValue({
    status: 'anonymous', user: null, login: vi.fn(), logout: vi.fn(), can: () => false, ...over,
  } as never);

const renderLogin = () =>
  render(<MemoryRouter><LoginPage /></MemoryRouter>);

describe('LoginPage', () => {
  it('demande l’e-mail et le mot de passe', async () => {
    const login = vi.fn();
    ctx({ login });
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(screen.getByText('Saisissez votre adresse e-mail.')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('refuse un e-mail mal formé', async () => {
    ctx({});
    renderLogin();
    await userEvent.type(screen.getByLabelText(/adresse e-mail/i), 'abc');
    await userEvent.type(screen.getByLabelText(/^Mot de passe/), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(screen.getByText(/n’est pas valide/)).toBeInTheDocument();
  });

  it('affiche l’erreur du serveur dans une alerte', async () => {
    ctx({ login: vi.fn().mockRejectedValue(new ApiError(401, 'X', 'Identifiants incorrects.')) });
    renderLogin();
    await userEvent.type(screen.getByLabelText(/adresse e-mail/i), 'a@b.ci');
    await userEvent.type(screen.getByLabelText(/^Mot de passe/), 'mauvais');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Identifiants incorrects.');
  });
});

describe('RequireAuth', () => {
  const tree = (area: 'member' | 'staff') => (
    <MemoryRouter initialEntries={['/prive']}>
      <Routes>
        <Route element={<RequireAuth area={area} />}><Route path="/prive" element={<p>Zone privée</p>} /></Route>
        <Route path="/connexion" element={<p>Page connexion</p>} />
        <Route path="/espace" element={<p>Espace membre</p>} />
        <Route path="/admin" element={<p>Espace admin</p>} />
      </Routes>
    </MemoryRouter>
  );

  it('renvoie un visiteur vers la connexion', () => {
    ctx({});
    render(tree('member'));
    expect(screen.getByText('Page connexion')).toBeInTheDocument();
  });

  it('laisse entrer un membre dans son espace', () => {
    ctx({ status: 'authenticated', user: { organizationId: 'o1' } as never });
    render(tree('member'));
    expect(screen.getByText('Zone privée')).toBeInTheDocument();
  });

  it('renvoie le personnel hors de l’espace membre', () => {
    ctx({ status: 'authenticated', user: { organizationId: null } as never });
    render(tree('member'));
    expect(screen.getByText('Espace admin')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BackLink } from '../ui/BackLink';

const app = (start: string[], index?: number) => (
  <MemoryRouter initialEntries={start} initialIndex={index}>
    <BackLink fallback="/espace" />
    <Routes>
      <Route path="/espace" element={<p>Accueil espace</p>} />
      <Route path="/espace/rapports" element={<Link to="/espace/rapports/1">Ouvrir</Link>} />
      <Route path="/espace/rapports/1" element={<p>Détail</p>} />
    </Routes>
  </MemoryRouter>
);

describe('flèche Retour', () => {
  it('n’apparaît pas sur la première page de l’espace', () => {
    render(app(['/espace']));
    expect(screen.queryByRole('button', { name: /Retour/ })).toBeNull();
  });
  it('revient à la page précédente', async () => {
    render(app(['/espace/rapports']));
    await userEvent.click(screen.getByRole('link', { name: 'Ouvrir' }));
    expect(screen.getByText('Détail')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retour à la page précédente' }));
    expect(screen.getByRole('link', { name: 'Ouvrir' })).toBeInTheDocument();
  });
  it('mène à l’accueil de l’espace quand on arrive directement sur la page', async () => {
    render(app(['/espace/rapports/1']));
    await userEvent.click(screen.getByRole('button', { name: /Retour/ }));
    expect(screen.getByText('Accueil espace')).toBeInTheDocument();
  });
});

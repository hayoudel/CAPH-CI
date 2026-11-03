import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkField, formatFcfa, formatSize, stepOfField, STEPS } from '../lib/adhesion';
import { clearDraft, loadDraft, saveDraft } from '../lib/draft';
import { TrackPage } from '../pages/adhesion/TrackPage';
import { WizardPage } from '../pages/adhesion/WizardPage';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const wrap = (ui: React.ReactNode, url = '/') => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>
  </QueryClientProvider>
);

const REQS = {
  category: { code: 'PM_ORGANISATION', label: 'Organisation (personne morale)', description: null, isOpen: true },
  eligibility: { intro: '', criteria: [] }, conditions: [], procedure: [], documents: [], fees: [], feesNotice: '',
  declarations: { acceptAccuracy: 'a', acceptStatutes: 'b', acceptDataProcessing: 'c' },
  fields: { organization: { name: { label: 'Dénomination', type: 'text', required: true, max: 200 } } },
  options: { regions: [], delegations: [], domains: [], disabilityTypes: [] },
};

describe('règles de saisie', () => {
  it('champ obligatoire, e-mail, téléphone et site', () => {
    expect(checkField({ label: 'x', type: 'text', required: true }, '  ')).toMatch(/obligatoire/);
    expect(checkField({ label: 'x', type: 'text', required: false }, '')).toBeNull();
    expect(checkField({ label: 'x', type: 'email', required: true }, 'abc')).toMatch(/e-mail invalide/);
    expect(checkField({ label: 'x', type: 'phone', required: true }, '+225 07 00 00 00 00')).toBeNull();
    expect(checkField({ label: 'x', type: 'url', required: false }, 'www.site.ci')).toMatch(/https/);
    expect(checkField({ label: 'x', type: 'uuidList', required: true }, [])).toMatch(/au moins un/);
  });
  it('renvoie chaque champ manquant à la bonne étape', () => {
    expect(stepOfField('organization.name')).toBe(1);
    expect(stepOfField('organization.interventionZone')).toBe(2);
    expect(stepOfField('delegationId')).toBe(2);
    expect(stepOfField('representative.email')).toBe(3);
    expect(stepOfField('treasurer.name')).toBe(4);
    expect(stepOfField('documents.STATUTES')).toBe(5);
    expect(STEPS).toHaveLength(7);
  });
  it('formate montants et tailles en français', () => {
    expect(formatFcfa(10000)).toBe('10 000 FCFA');
    expect(formatSize(2 * 1024 * 1024)).toBe('2,0 Mo');
  });
});

describe('brouillon', () => {
  beforeEach(() => clearDraft());
  it('est gardé en mémoire d’onglet seulement', () => {
    expect(loadDraft()).toBeNull();
    saveDraft({ id: 'a', code: 'b' });
    expect(loadDraft()).toEqual({ id: 'a', code: 'b' });
    expect(localStorage.length).toBe(0);
    clearDraft();
    expect(loadDraft()).toBeNull();
  });
});

describe('formulaire d’adhésion', () => {
  beforeEach(() => clearDraft());
  afterEach(() => vi.restoreAllMocks());

  it('commence à l’étape 1 et signale les champs obligatoires sans rien envoyer', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(REQS));
    render(wrap(<WizardPage />, '/adhesion/demande'));
    await userEvent.click(await screen.findByRole('button', { name: 'Commencer ma demande' }));
    expect(screen.getByText('Saisissez votre nom complet.')).toBeInTheDocument();
    expect(screen.getByText(/Adresse e-mail invalide/)).toBeInTheDocument();
    expect(f.mock.calls.some(([u, i]) => String(u).endsWith('/memberships/requests') && (i as RequestInit)?.method === 'POST')).toBe(false);
  });

  it('affiche « Demande introuvable » si le brouillon n’existe plus', async () => {
    saveDraft({ id: '11111111-1111-1111-1111-111111111111', code: 'x'.repeat(30) });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (u) => (String(u).includes('/requirements') ? json(REQS) : json({ code: 'REQUEST_NOT_FOUND', message: 'Aucun dossier' }, 404)));
    render(wrap(<WizardPage />, '/adhesion/demande?etape=3'));
    expect(await screen.findByText('Demande introuvable')).toBeInTheDocument();
  });
});

describe('suivi de dossier', () => {
  afterEach(() => vi.restoreAllMocks());
  it('refuse une référence mal formée sans appeler le serveur', async () => {
    const f = vi.spyOn(globalThis, 'fetch');
    render(wrap(<TrackPage />));
    await userEvent.type(screen.getByLabelText(/Référence du dossier/), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Voir mon dossier' }));
    expect(screen.getByText(/Référence invalide/)).toBeInTheDocument();
    expect(f).not.toHaveBeenCalled();
  });
  it('affiche un message clair si le dossier est introuvable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ code: 'REQUEST_NOT_FOUND', message: 'Aucun dossier' }, 404));
    render(wrap(<TrackPage />));
    await userEvent.type(screen.getByLabelText(/Référence du dossier/), 'CAPH-2026-000001');
    await userEvent.type(screen.getByLabelText(/Adresse e-mail/), 'a@b.ci');
    await userEvent.type(screen.getByLabelText(/Code de suivi/), 'x'.repeat(30));
    await userEvent.click(screen.getByRole('button', { name: 'Voir mon dossier' }));
    expect(await screen.findByText('Dossier introuvable')).toBeInTheDocument();
  });
});

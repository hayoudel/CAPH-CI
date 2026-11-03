import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { DirectoryFilters, Paginated, PublicOrganization } from '../api/types';
import { usePageTitle } from '../lib/usePageTitle';
import { Alert } from '../ui/Alert';
import { Button, LinkButton } from '../ui/Button';
import { SelectField, TextField } from '../ui/Field';
import { Spinner } from '../ui/Spinner';

const LIMIT = 12;

export function DirectoryPage() {
  usePageTitle('Annuaire des organisations');
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const filters = useQuery({ queryKey: ['filters'], queryFn: () => api<DirectoryFilters>('/directory/filters', { auth: false }), staleTime: 3_600_000 });
  const page = Number(params.get('page') ?? 1) || 1;
  const query = { q: params.get('q') ?? undefined, regionId: params.get('regionId') ?? undefined, domainId: params.get('domainId') ?? undefined, disabilityTypeId: params.get('disabilityTypeId') ?? undefined, page, limit: LIMIT };
  const list = useQuery({
    queryKey: ['directory', query],
    queryFn: () => api<Paginated<PublicOrganization>>('/directory/organizations', { auth: false, query }),
    placeholderData: (prev) => prev,
  });

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next);
  };
  const submit = (e: FormEvent) => { e.preventDefault(); setParam('q', text.trim()); };
  const reset = () => { setText(''); setParams({}); };
  const total = list.data?.meta.total ?? 0;
  const pages = list.data?.meta.totalPages ?? 1;
  const hasFilter = ['q', 'regionId', 'domainId', 'disabilityTypeId'].some((k) => params.get(k));

  return (
    <div className="container stack">
      <div className="page-head">
        <h1>Annuaire des organisations</h1>
        <p>Les organisations de personnes handicapées membres de la CAPH-CI qui ont choisi d’apparaître ici.</p>
      </div>

      <form className="panel" role="search" aria-label="Rechercher une organisation" onSubmit={submit}>
        <div className="filters">
          <TextField label="Nom ou sigle" type="search" value={text} onChange={(e) => setText(e.target.value)} />
          <SelectField label="Région" value={params.get('regionId') ?? ''} placeholder="Toutes les régions"
            options={(filters.data?.regions ?? []).map((r) => ({ value: r.id, label: r.name }))} onChange={(e) => setParam('regionId', e.target.value)} />
          <SelectField label="Domaine d’intervention" value={params.get('domainId') ?? ''} placeholder="Tous les domaines"
            options={(filters.data?.domains ?? []).map((r) => ({ value: r.id, label: r.label }))} onChange={(e) => setParam('domainId', e.target.value)} />
          <SelectField label="Type de handicap" value={params.get('disabilityTypeId') ?? ''} placeholder="Tous les types"
            options={(filters.data?.disabilityTypes ?? []).map((r) => ({ value: r.id, label: r.label }))} onChange={(e) => setParam('disabilityTypeId', e.target.value)} />
        </div>
        <div className="row">
          <Button type="submit">Rechercher</Button>
          {hasFilter && <Button variant="secondary" onClick={reset}>Effacer la recherche</Button>}
        </div>
      </form>

      <div aria-live="polite">
        {list.isLoading && <Spinner />}
        {list.isError && <Alert kind="error" title="Chargement impossible">{list.error.message}</Alert>}
        {list.data && <p><strong>{total}</strong> {total > 1 ? 'organisations trouvées' : 'organisation trouvée'}</p>}
      </div>

      {list.data && total === 0 && (
        <p className="empty">{hasFilter ? 'Aucune organisation ne correspond à votre recherche. Essayez avec moins de critères.' : 'Aucune organisation n’est encore publiée dans l’annuaire.'}</p>
      )}
      {list.data && total > 0 && (
        <ul className="card-grid">
          {list.data.data.map((o) => (
            <li key={o.id}>
              <Link className="card-link" to={`/annuaire/${o.id}`}>
                <article className="panel">
                  <h2 className="panel__title">{o.name}</h2>
                  {o.acronym && <p className="item__meta">{o.acronym}</p>}
                  <p style={{ margin: 0 }}>{[o.commune, o.region?.name].filter(Boolean).join(', ') || 'Lieu non précisé'}</p>
                  {o.domains.length > 0 && <p className="item__meta" style={{ marginTop: 'var(--space-2)' }}>{o.domains.map((d) => d.label).join(' · ')}</p>}
                </article>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="pager" aria-label="Pagination">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>Page précédente</Button>
          <span>Page {page} sur {pages}</span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setParam('page', String(page + 1))}>Page suivante</Button>
        </nav>
      )}
    </div>
  );
}

export function DirectoryDetailPage() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['directory', id], queryFn: () => api<PublicOrganization>(`/directory/organizations/${id}`, { auth: false }), retry: false });
  usePageTitle(q.data?.name ?? 'Organisation');

  if (q.isLoading) return <div className="container"><Spinner /></div>;
  if (q.isError || !q.data) {
    return (
      <div className="container container--narrow stack">
        <h1>Organisation introuvable</h1>
        <p>Cette organisation n’existe pas ou n’apparaît pas dans l’annuaire.</p>
        <LinkButton to="/annuaire">Retour à l’annuaire</LinkButton>
      </div>
    );
  }
  const o = q.data;
  const c = o.contact;
  const hasContact = c.email || c.phone || c.website || c.postalAddress;
  return (
    <div className="container container--narrow stack">
      <p><Link to="/annuaire">← Retour à l’annuaire</Link></p>
      <div className="page-head">
        <h1>{o.name}</h1>
        {o.acronym && <p>{o.acronym}</p>}
      </div>
      <section className="panel" aria-labelledby="loc">
        <h2 id="loc" className="panel__title">Où et comment</h2>
        <dl className="dl">
          <dt>Région</dt><dd>{o.region?.name ?? 'Non précisée'}</dd>
          <dt>Commune</dt><dd>{o.commune ?? 'Non précisée'}</dd>
          <dt>Zone d’intervention</dt><dd>{o.interventionZone ?? 'Non précisée'}</dd>
        </dl>
      </section>
      <section className="panel" aria-labelledby="act">
        <h2 id="act" className="panel__title">Activités</h2>
        <h3>Domaines d’intervention</h3>
        {o.domains.length ? <ul className="tags">{o.domains.map((d) => <li key={d.id} className="badge badge--green">{d.label}</li>)}</ul> : <p className="empty">Non précisés.</p>}
        <h3 style={{ marginTop: 'var(--space-4)' }}>Types de handicap concernés</h3>
        {o.disabilityTypes.length ? <ul className="tags">{o.disabilityTypes.map((d) => <li key={d.id} className="badge badge--grey">{d.label}</li>)}</ul> : <p className="empty">Non précisés.</p>}
      </section>
      <section className="panel" aria-labelledby="ctc">
        <h2 id="ctc" className="panel__title">Contact</h2>
        {hasContact ? (
          <dl className="dl">
            {c.email && <><dt>E-mail</dt><dd><a href={`mailto:${c.email}`}>{c.email}</a></dd></>}
            {c.phone && <><dt>Téléphone</dt><dd><a href={`tel:${c.phone.replace(/[^+\d]/g, '')}`}>{c.phone}</a></dd></>}
            {c.website && <><dt>Site internet</dt><dd><a href={c.website} rel="noopener noreferrer">{c.website}</a></dd></>}
            {c.postalAddress && <><dt>Adresse postale</dt><dd>{c.postalAddress}</dd></>}
          </dl>
        ) : <p className="empty">Cette organisation n’a pas publié de coordonnées.</p>}
      </section>
    </div>
  );
}

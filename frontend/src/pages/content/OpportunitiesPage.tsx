import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Opportunity, Paginated } from '../../api/types';
import { formatDate, formatSize, OPPORTUNITY_STATUSES, OPPORTUNITY_TYPES } from '../../lib/format';
import { useListParams } from '../../lib/useListParams';
import { usePageTitle } from '../../lib/usePageTitle';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { DownloadButton } from '../../ui/DownloadButton';
import { SelectField, TextField } from '../../ui/Field';
import { Pager } from '../../ui/Pager';
import { Spinner } from '../../ui/Spinner';

const statusBadge = (s: string) => (s === 'OPEN' ? 'badge badge--green' : 'badge badge--grey');

export function OpportunitiesPage() {
  usePageTitle('Opportunités');
  const f = useListParams();
  const [text, setText] = useState(f.get('q'));
  const status = f.get('status') || 'OPEN';
  const query = { q: f.get('q') || undefined, type: f.get('type') || undefined, status, page: f.page, limit: 10 };
  const list = useQuery({ queryKey: ['opportunities', query], queryFn: () => api<Paginated<Opportunity>>('/opportunities', { query }), placeholderData: (p) => p });
  const submit = (e: FormEvent) => { e.preventDefault(); f.set('q', text.trim()); };
  const total = list.data?.meta.total ?? 0;
  const hasFilter = f.has('q', 'type', 'status');

  return (
    <>
      <header className="page-head">
        <h1>Opportunités</h1>
        <p>Appels à projets, formations, consultations et offres ouvertes aux organisations membres.</p>
      </header>
      <div className="stack">
        <form className="panel" role="search" aria-label="Rechercher une opportunité" onSubmit={submit}>
          <div className="filters">
            <TextField label="Titre, résumé ou référence" type="search" value={text} onChange={(e) => setText(e.target.value)} />
            <SelectField label="Type" value={f.get('type')} placeholder="Tous les types"
              options={Object.entries(OPPORTUNITY_TYPES).map(([value, label]) => ({ value, label }))} onChange={(e) => f.set('type', e.target.value)} />
            <SelectField label="État" value={status}
              options={[{ value: 'OPEN', label: 'Ouvertes' }, { value: 'ENDED', label: 'Terminées' }, { value: 'CLOSED', label: 'Fermées' }]}
              onChange={(e) => f.set('status', e.target.value)} />
          </div>
          <div className="row">
            <Button type="submit">Rechercher</Button>
            {hasFilter && <Button variant="secondary" onClick={() => { setText(''); f.reset(); }}>Effacer la recherche</Button>}
          </div>
        </form>

        <div aria-live="polite">
          {list.isLoading && <Spinner />}
          {list.isError && <Alert kind="error" title="Chargement impossible">{list.error.message}</Alert>}
          {list.data && <p><strong>{total}</strong> {total > 1 ? 'opportunités trouvées' : 'opportunité trouvée'}</p>}
        </div>

        {list.data && total === 0 && <p className="empty">Aucune opportunité ne correspond. Essayez un autre état ou effacez la recherche.</p>}
        {list.data && total > 0 && (
          <ul className="stack-list">
            {list.data.data.map((o) => (
              <li key={o.id}>
                <article className="panel">
                  <h2 className="panel__title"><Link to={`/espace/opportunites/${o.id}`}>{o.title}</Link></h2>
                  <p className="item__meta">
                    <span className="badge badge--grey">{OPPORTUNITY_TYPES[o.type] ?? o.type}</span>{' '}
                    <span className={statusBadge(o.effectiveStatus)}>{OPPORTUNITY_STATUSES[o.effectiveStatus]}</span>{' '}
                    Réf. {o.reference}{o.deadline ? ` — date limite : ${formatDate(o.deadline)}` : ''}
                  </p>
                  <p style={{ margin: 0 }}>{o.summary}</p>
                </article>
              </li>
            ))}
          </ul>
        )}
        <Pager page={f.page} pages={list.data?.meta.totalPages ?? 1} onPage={(p) => f.set('page', String(p))} />
      </div>
    </>
  );
}

export function OpportunityDetailPage() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['opportunity', id], queryFn: () => api<Opportunity>(`/opportunities/${id}`), retry: false });
  usePageTitle(q.data?.title ?? 'Opportunité');
  if (q.isLoading) return <Spinner />;
  if (q.isError || !q.data) {
    return (
      <div className="stack">
        <h1>Opportunité introuvable</h1>
        <p>Cette opportunité n’existe pas ou n’est plus disponible.</p>
        <p><Link to="/espace/opportunites">Retour aux opportunités</Link></p>
      </div>
    );
  }
  const o = q.data;
  return (
    <div className="stack">
      <header className="page-head">
        <h1>{o.title}</h1>
        <p>
          <span className="badge badge--grey">{OPPORTUNITY_TYPES[o.type] ?? o.type}</span>{' '}
          <span className={statusBadge(o.effectiveStatus)}>{OPPORTUNITY_STATUSES[o.effectiveStatus]}</span>
        </p>
      </header>
      {o.effectiveStatus !== 'OPEN' && (
        <Alert kind="info" title="Cette opportunité n’accepte plus de candidatures">
          {o.deadline ? `La date limite était le ${formatDate(o.deadline)}.` : 'Elle a été fermée par la CAPH-CI.'}
        </Alert>
      )}
      <section className="panel" aria-labelledby="infos">
        <h2 id="infos" className="panel__title">En bref</h2>
        <dl className="dl">
          <dt>Référence</dt><dd>{o.reference}</dd>
          <dt>Date limite</dt><dd>{o.deadline ? formatDate(o.deadline) : 'Aucune date limite'}</dd>
          {o.audience && <><dt>Pour qui</dt><dd>{o.audience}</dd></>}
          {o.modality && <><dt>Comment candidater</dt><dd>{o.modality}</dd></>}
        </dl>
        <p>{o.summary}</p>
      </section>
      {o.body && (
        <section className="panel" aria-labelledby="detail">
          <h2 id="detail" className="panel__title">Détails</h2>
          <p className="prose">{o.body}</p>
        </section>
      )}
      {o.hasSheet && o.sheet && (
        <section className="panel" aria-labelledby="fiche">
          <h2 id="fiche" className="panel__title">Fiche à télécharger</h2>
          <p className="item__meta">{o.sheet.originalName} ({formatSize(o.sheet.sizeBytes)})</p>
          <DownloadButton path={`/opportunities/${o.id}/sheet`} name={o.sheet.originalName} label="Télécharger la fiche" variant="primary" />
        </section>
      )}
    </div>
  );
}

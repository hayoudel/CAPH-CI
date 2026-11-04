import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Communication, Paginated } from '../../api/types';
import { formatDateTime } from '../../lib/format';
import { useListParams } from '../../lib/useListParams';
import { usePageTitle } from '../../lib/usePageTitle';
import { Alert } from '../../ui/Alert';
import { SelectField } from '../../ui/Field';
import { Pager } from '../../ui/Pager';
import { Spinner } from '../../ui/Spinner';

export function CommunicationsPage() {
  usePageTitle('Communications');
  const f = useListParams();
  const query = { unread: f.get('filter') === 'unread' ? true : undefined, page: f.page, limit: 10 };
  const list = useQuery({ queryKey: ['communications', query], queryFn: () => api<Paginated<Communication>>('/communications', { query }), placeholderData: (p) => p });
  const total = list.data?.meta.total ?? 0;

  return (
    <>
      <header className="page-head">
        <h1>Communications</h1>
        <p>Les messages que la CAPH-CI adresse aux organisations membres.</p>
      </header>
      <div className="stack">
        <div className="panel">
          <div className="filters">
            <SelectField label="Afficher" value={f.get('filter') || 'all'}
              options={[{ value: 'all', label: 'Toutes les communications' }, { value: 'unread', label: 'Seulement les non lues' }]}
              onChange={(e) => f.set('filter', e.target.value === 'all' ? '' : e.target.value)} />
          </div>
        </div>

        <div aria-live="polite">
          {list.isLoading && <Spinner />}
          {list.isError && <Alert kind="error" title="Chargement impossible">{list.error.message}</Alert>}
          {list.data && <p><strong>{total}</strong> {total > 1 ? 'communications' : 'communication'}</p>}
        </div>

        {list.data && total === 0 && (
          <p className="empty">{f.get('filter') === 'unread' ? 'Vous avez tout lu. Bravo !' : 'Aucune communication pour le moment.'}</p>
        )}
        {list.data && total > 0 && (
          <ul className="stack-list">
            {list.data.data.map((c) => (
              <li key={c.id}>
                <article className="panel">
                  <h2 className="panel__title">
                    <Link to={`/espace/communications/${c.id}`}>{c.title}</Link>
                    {!c.isRead && <> <span className="badge badge--orange">Non lue</span></>}
                  </h2>
                  <p className="item__meta">{formatDateTime(c.publishedAt)} — {c.senderLabel}{c.category ? ` — ${c.category}` : ''}</p>
                  {c.excerpt && <p style={{ margin: 0 }}>{c.excerpt}</p>}
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

export function CommunicationDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['communication', id], queryFn: () => api<Communication>(`/communications/${id}`), retry: false });
  usePageTitle(q.data?.title ?? 'Communication');
  // Ouvrir une communication la marque comme lue : on rafraîchit les compteurs du tableau de bord et la liste.
  useEffect(() => {
    if (q.data) {
      void qc.invalidateQueries({ queryKey: ['communications'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    }
  }, [q.data, qc]);

  if (q.isLoading) return <Spinner />;
  if (q.isError || !q.data) {
    return (
      <div className="stack">
        <h1>Communication introuvable</h1>
        <p>Ce message n’existe pas ou ne vous est pas destiné.</p>
        <p><Link to="/espace/communications">Retour aux communications</Link></p>
      </div>
    );
  }
  const c = q.data;
  return (
    <div className="stack">
      <header className="page-head">
        <h1>{c.title}</h1>
        <p>{formatDateTime(c.publishedAt)} — {c.senderLabel}{c.category ? ` — ${c.category}` : ''}</p>
      </header>
      <article className="panel"><p className="prose">{c.body}</p></article>
    </div>
  );
}

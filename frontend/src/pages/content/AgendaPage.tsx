import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { AgendaEvent, Paginated } from '../../api/types';
import { EVENT_MODES, EVENT_STATUSES, EVENT_TYPES, formatDay } from '../../lib/format';
import { useListParams } from '../../lib/useListParams';
import { usePageTitle } from '../../lib/usePageTitle';
import { Alert } from '../../ui/Alert';
import { SelectField } from '../../ui/Field';
import { Pager } from '../../ui/Pager';
import { Spinner } from '../../ui/Spinner';

const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function when(e: AgendaEvent) {
  const start = new Date(e.startsAt);
  const end = e.endsAt ? new Date(e.endsAt) : null;
  if (!end) return `${formatDay(start)} à ${time.format(start)}`;
  if (sameDay(start, end)) return `${formatDay(start)}, de ${time.format(start)} à ${time.format(end)}`;
  return `Du ${formatDay(start)} à ${time.format(start)} au ${formatDay(end)} à ${time.format(end)}`;
}

export function AgendaPage() {
  usePageTitle('Agenda');
  const f = useListParams();
  const past = f.get('when') === 'past';
  const query = { past: past || undefined, type: f.get('type') || undefined, page: f.page, limit: 10 };
  const list = useQuery({ queryKey: ['events', query], queryFn: () => api<Paginated<AgendaEvent>>('/events', { query }), placeholderData: (p) => p });
  const total = list.data?.meta.total ?? 0;

  return (
    <>
      <header className="page-head">
        <h1>Agenda</h1>
        <p>Réunions, formations, assemblées et autres rendez-vous de la CAPH-CI.</p>
      </header>
      <div className="stack">
        <div className="panel">
          <div className="filters">
            <SelectField label="Période" value={past ? 'past' : 'upcoming'}
              options={[{ value: 'upcoming', label: 'À venir' }, { value: 'past', label: 'Passés' }]}
              onChange={(e) => f.set('when', e.target.value === 'past' ? 'past' : '')} />
            <SelectField label="Type d’événement" value={f.get('type')} placeholder="Tous les types"
              options={Object.entries(EVENT_TYPES).map(([value, label]) => ({ value, label }))} onChange={(e) => f.set('type', e.target.value)} />
          </div>
        </div>

        <div aria-live="polite">
          {list.isLoading && <Spinner />}
          {list.isError && <Alert kind="error" title="Chargement impossible">{list.error.message}</Alert>}
          {list.data && <p><strong>{total}</strong> {total > 1 ? 'événements' : 'événement'}</p>}
        </div>

        {list.data && total === 0 && <p className="empty">{past ? 'Aucun événement passé.' : 'Aucun événement à venir pour le moment.'}</p>}
        {list.data && total > 0 && (
          <ul className="stack-list">
            {list.data.data.map((e) => (
              <li key={e.id}>
                <article className="panel">
                  <h2 className="panel__title">{e.title}</h2>
                  <p className="item__meta">
                    <span className="badge badge--grey">{EVENT_TYPES[e.type] ?? e.type}</span>{' '}
                    <span className={e.status === 'CANCELLED' ? 'badge badge--orange' : 'badge badge--green'}>{EVENT_STATUSES[e.status] ?? e.status}</span>
                  </p>
                  <p style={{ margin: '0 0 var(--space-2)' }}><strong>{when(e)}</strong></p>
                  <p className="item__meta" style={{ margin: 0 }}>
                    {EVENT_MODES[e.mode] ?? e.mode}{e.location ? ` — ${e.location}` : ''}{e.region ? ` (${e.region.name})` : ''}
                  </p>
                  {e.description && <p style={{ marginBottom: 0 }}>{e.description}</p>}
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

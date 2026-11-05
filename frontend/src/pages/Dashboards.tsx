import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { Dashboard, EventItem, MemberDashboard, OpportunityItem, StaffDashboard } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { EVENT_MODES, EVENT_TYPES, OPPORTUNITY_TYPES, formatDate, formatDay } from '../lib/format';
import { usePageTitle } from '../lib/usePageTitle';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: () => api<Dashboard>('/dashboard') });
}

function Panel({ title, children, more }: { title: string; children: ReactNode; more?: { to: string; label: string } }) {
  const id = `p-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id} className="panel__title">{title}</h2>
      {children}
      {more && <p className="panel__more"><Link to={more.to}>{more.label}</Link></p>}
    </section>
  );
}

function Events({ items }: { items: EventItem[] }) {
  if (!items.length) return <p className="empty">Aucun événement à venir pour le moment.</p>;
  return (
    <ul className="plain-list">
      {items.map((e) => (
        <li key={e.id}>
          <span className="item__title">{e.title}</span>
          <span className="item__meta">
            {formatDay(e.startsAt)} · {EVENT_TYPES[e.type] ?? e.type} · {EVENT_MODES[e.mode] ?? e.mode}{e.location ? ` · ${e.location}` : ''}
          </span>
          {e.status === 'CANCELLED' && <> <span className="badge badge--orange">Annulé</span></>}
        </li>
      ))}
    </ul>
  );
}

function Opportunities({ items }: { items: OpportunityItem[] }) {
  if (!items.length) return <p className="empty">Aucune opportunité ouverte pour le moment.</p>;
  return (
    <ul className="plain-list">
      {items.map((o) => (
        <li key={o.id}>
          <span className="item__title">{o.title}</span>
          <span className="item__meta">
            {OPPORTUNITY_TYPES[o.type] ?? o.type} · {o.deadline ? `jusqu’au ${formatDate(o.deadline)}` : 'sans date limite'}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Counts({ data, labels, empty }: { data: Record<string, number>; labels: Record<string, string>; empty: string }) {
  const rows = Object.entries(data).filter(([, n]) => n > 0);
  if (!rows.length) return <p className="empty">{empty}</p>;
  return (
    <ul className="plain-list">
      {rows.map(([k, n]) => <li key={k}><span className="item__title">{labels[k] ?? k}</span><span className="item__meta">{n}</span></li>)}
    </ul>
  );
}

function State({ query }: { query: ReturnType<typeof useDashboard> }) {
  if (query.isPending) return <Spinner label="Chargement de votre tableau de bord…" />;
  if (query.isError) {
    const msg = query.error instanceof ApiError ? query.error.message : 'Le tableau de bord n’a pas pu être chargé.';
    return (
      <>
        <Alert kind="error" title="Chargement impossible">{msg}</Alert>
        <Button variant="secondary" onClick={() => query.refetch()}>Réessayer</Button>
      </>
    );
  }
  return null;
}

// ─────────────────────────────── Organisation ───────────────────────────────

const KIND_LABELS = { news: 'Actualité', project: 'Projet', report: 'Rapport' } as const;
const statusBadge = (s: string) =>
  ['PUBLISHED', 'APPROVED', 'VALIDATED', 'ONGOING', 'COMPLETED', 'PROCESSED'].includes(s) ? 'badge badge--green'
  : ['CORRECTION', 'REJECTED', 'TO_COMPLETE', 'CORRECTION_REQUESTED'].includes(s) ? 'badge badge--orange' : 'badge badge--grey';

function MemberView({ d, firstName }: { d: MemberDashboard; firstName: string }) {
  const unread = d.unreadCommunications;
  const todo = d.notifications.filter((n) => n.needsAction);
  return (
    <>
      <header className="page-head">
        <h1>Bonjour {firstName}</h1>
        <p>{d.organization.name}</p>
        <dl className="facts">
          {d.organization.memberNumber && <div><dt>N° de membre</dt><dd>{d.organization.memberNumber}</dd></div>}
          {d.role && <div><dt>Votre rôle</dt><dd>{d.role.label}</dd></div>}
          {d.organization.registeredAt && <div><dt>Membre depuis le</dt><dd>{formatDate(d.organization.registeredAt)}</dd></div>}
        </dl>
      </header>

      <div className="stack">
        {d.hasDemoData && <Alert kind="info" title="Données de démonstration">Cet espace contient des exemples fictifs, repérés par l’étiquette « Données de démonstration ». Ils ne représentent aucune activité réelle de la CAPH-CI.</Alert>}
        {todo.length > 0 && (
          <Alert kind="error" title={todo.length === 1 ? '1 élément demande votre action' : `${todo.length} éléments demandent votre action`}>
            <ul className="plain-list">
              {todo.slice(0, 2).map((n) => <li key={`${n.kind}-${n.id}`}><Link to={n.link}>{KIND_LABELS[n.kind]} : {n.title}</Link> — {n.statusLabel}{n.note ? ` (${n.note})` : ''}</li>)}
            </ul>
          </Alert>
        )}
        <div className="grid-2">
          {d.myProjects && (
            <Panel title="Mes projets en cours" more={{ to: '/espace/projets?filter=MINE', label: 'Voir mes projets' }}>
              {d.myProjects.ongoing.length === 0 ? <p className="empty">Aucun projet en cours.</p> : (
                <ul className="plain-list">
                  {d.myProjects.ongoing.slice(0, 2).map((p) => (
                    <li key={p.id}>
                      <Link to={`/espace/projets/${p.id}`} className="item__title">{p.title}</Link>
                      <span className="item__meta">
                        {p.endDate ? `Fin prévue le ${formatDate(p.endDate)}` : 'Fin non précisée'} · {p.progress !== null ? `Avancement : ${p.progress} %` : 'Avancement non renseigné'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
          {d.myProjects && (
            <Panel title="Mes projets en attente de validation" more={{ to: '/espace/projets?filter=PENDING', label: 'Voir les projets en attente' }}>
              {d.myProjects.pending.length === 0 ? <p className="empty">Aucun projet en attente de validation.</p> : (
                <ul className="plain-list">
                  {d.myProjects.pending.slice(0, 2).map((p) => (
                    <li key={p.id}><Link to={`/espace/projets/${p.id}`} className="item__title">{p.title}</Link> <span className={statusBadge(p.status)}>{p.statusLabel}</span></li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
          {d.myNews && (
            <Panel title="Mes propositions d’actualités" more={{ to: '/espace/actualites', label: 'Voir mes propositions' }}>
              {d.myNews.length === 0 ? <p className="empty">Vous n’avez pas encore proposé d’actualité.</p> : (
                <ul className="plain-list">
                  {d.myNews.slice(0, 2).map((n) => <li key={n.id}><Link to={`/espace/actualites/${n.id}`} className="item__title">{n.title}</Link> <span className={statusBadge(n.status)}>{n.statusLabel}</span></li>)}
                </ul>
              )}
            </Panel>
          )}
          {d.myReports && (
            <Panel title="Mes rapports soumis" more={{ to: '/espace/rapports', label: 'Voir mes rapports' }}>
              {d.myReports.length === 0 ? <p className="empty">Vous n’avez pas encore transmis de rapport.</p> : (
                <ul className="plain-list">
                  {d.myReports.slice(0, 2).map((r) => (
                    <li key={r.id}><Link to={`/espace/rapports/${r.id}`} className="item__title">{r.title}</Link> <span className={statusBadge(r.status)}>{r.statusLabel}</span><span className="item__meta">Transmis le {formatDate(r.date)}</span></li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
          <Panel title="Prochaines opportunités" more={{ to: '/espace/opportunites', label: 'Toutes les opportunités' }}><Opportunities items={d.openOpportunities.slice(0, 2)} /></Panel>
          <Panel title="Prochains événements" more={{ to: '/espace/agenda', label: 'Voir l’agenda' }}><Events items={d.upcomingEvents.slice(0, 2)} /></Panel>
          <Panel title="Communications non lues" more={{ to: '/espace/communications', label: 'Toutes les communications' }}>
            {unread === 0 ? <p className="empty">Vous avez tout lu.</p> : (
              <>
                <p style={{ margin: 0 }}><strong>{unread}</strong> {unread > 1 ? 'communications non lues' : 'communication non lue'}</p>
                <ul className="plain-list">
                  {d.latestCommunications.filter((c) => !c.isRead).slice(0, 2).map((c) => (
                    <li key={c.id}><Link to={`/espace/communications/${c.id}`} className="item__title">{c.title}</Link><span className="item__meta">{formatDate(c.publishedAt)}{c.category ? ` · ${c.category}` : ''}</span></li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
          <Panel title="Décisions et demandes de la CAPH-CI">
            {d.notifications.length === 0 ? <p className="empty">Aucune décision récente.</p> : (
              <ul className="plain-list">
                {d.notifications.slice(0, 2).map((n, i) => (
                  <li key={`${n.kind}-${n.id}-${i}`}>
                    <Link to={n.link} className="item__title">{KIND_LABELS[n.kind]} : {n.title}</Link>{' '}
                    <span className={statusBadge(n.status)}>{n.statusLabel}</span>
                    <span className="item__meta">{formatDate(n.date)}{n.note ? ` — ${n.note}` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

export function MemberDashboardPage() {
  usePageTitle('Tableau de bord');
  const { user } = useAuth();
  const q = useDashboard();
  if (q.data && q.data.kind !== 'MEMBER') return null;
  return q.data ? <MemberView d={q.data} firstName={user?.firstName ?? ''} /> : <State query={q} />;
}

// ─────────────────────────────── Personnel CAPH-CI ───────────────────────────────

function StaffView({ d, firstName }: { d: StaffDashboard; firstName: string }) {
  const m = d.memberships;
  const todo: { label: string; n: number }[] = [];
  if (m) todo.push({ label: 'Demandes d’adhésion à traiter', n: m.toProcess });
  if (d.reports) todo.push({ label: 'Rapports à traiter', n: d.reports.received + d.reports.inProcess });
  if (d.newsToReview !== null) todo.push({ label: 'Actualités à valider', n: d.newsToReview });

  return (
    <>
      <header className="page-head">
        <h1>Bonjour {firstName}</h1>
        <p>Voici ce qui demande votre attention aujourd’hui.</p>
      </header>
      <div className="stack">
        {m && m.overdue > 0 && (
          <Alert kind="error" title={m.overdue === 1 ? '1 dossier d’adhésion attend depuis trop longtemps' : `${m.overdue} dossiers d’adhésion attendent depuis trop longtemps`}>
            Ils n’ont pas bougé depuis plus de {m.overdueAfterDays} jours.
          </Alert>
        )}
        <div className="grid-2">
          {todo.length > 0 && (
            <Panel title="À traiter">
              <ul className="plain-list">
                {todo.map((t) => (
                  <li key={t.label}><span className="item__title">{t.label}</span><span className="item__meta">{t.n === 0 ? 'Rien en attente' : t.n}</span></li>
                ))}
              </ul>
            </Panel>
          )}
          {d.contentsToReview && (
            <Panel title="Contenus des organisations à valider">
              {d.contentsToReview.total === 0 ? <p className="empty" style={{ margin: 0 }}>Aucun contenu en attente de validation.</p> : (
                <ul className="plain-list">
                  {([['opportunities', 'Opportunités', '/admin/opportunites'], ['events', 'Événements', '/admin/agenda']] as const)
                    .filter(([k]) => d.contentsToReview![k] > 0)
                    .map(([k, label, to]) => (
                      <li key={k}><Link to={`${to}?review=PENDING`}>{label}</Link><span className="item__meta">{d.contentsToReview![k]} en attente</span></li>
                    ))}
                </ul>
              )}
            </Panel>
          )}
          {m && (
            <Panel title="Adhésions par statut">
              <Counts data={m.byStatus} labels={m.labels} empty="Aucun dossier déposé pour le moment." />
            </Panel>
          )}
          {d.activeOrganizations !== null && (
            <Panel title="Organisations membres">
              <p style={{ margin: 0 }}><strong>{d.activeOrganizations}</strong> {d.activeOrganizations > 1 ? 'organisations actives' : 'organisation active'}</p>
            </Panel>
          )}
          <Panel title="Prochains événements"><Events items={d.upcomingEvents} /></Panel>
          <Panel title="Opportunités ouvertes"><Opportunities items={d.openOpportunities} /></Panel>
        </div>
      </div>
    </>
  );
}

export function StaffDashboardPage() {
  usePageTitle('Tableau de bord');
  const { user } = useAuth();
  const q = useDashboard();
  if (q.data && q.data.kind !== 'STAFF') return null;
  return q.data ? <StaffView d={q.data} firstName={user?.firstName ?? ''} /> : <State query={q} />;
}

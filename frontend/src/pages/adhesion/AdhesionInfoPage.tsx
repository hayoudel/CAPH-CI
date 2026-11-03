import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { MembershipCategory, MembershipRequirements } from '../../api/types';
import { formatFcfa, PERIODICITY, REQUIREMENT_LABELS } from '../../lib/adhesion';
import { loadDraft } from '../../lib/draft';
import { usePageTitle } from '../../lib/usePageTitle';
import { Alert } from '../../ui/Alert';
import { LinkButton } from '../../ui/Button';
import { Spinner } from '../../ui/Spinner';

export function AdhesionInfoPage() {
  usePageTitle('Adhérer à la CAPH-CI');
  const reqs = useQuery({ queryKey: ['requirements', 'PM_ORGANISATION'], queryFn: () => api<MembershipRequirements>('/memberships/requirements', { auth: false, query: { category: 'PM_ORGANISATION' } }) });
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api<MembershipCategory[]>('/memberships/categories', { auth: false }) });
  const draft = loadDraft();

  if (reqs.isLoading) return <div className="container"><Spinner /></div>;
  if (reqs.isError || !reqs.data) return <div className="container"><Alert kind="error" title="Chargement impossible">{reqs.error?.message}</Alert></div>;
  const r = reqs.data;
  const upcoming = (cats.data ?? []).filter((c) => !c.isOpen);

  return (
    <div className="container container--narrow stack">
      <div className="page-head">
        <h1>Adhérer à la CAPH-CI</h1>
        <p>Déposez votre demande en ligne, sans créer de compte. Comptez environ 20 minutes ; vous pouvez enregistrer et reprendre plus tard.</p>
      </div>

      <div className="panel panel--soft">
        <h2 className="panel__title">Demande pour : {r.category.label}</h2>
        <div className="row">
          <LinkButton to="/adhesion/demande">{draft ? 'Continuer ma demande' : 'Commencer ma demande'}</LinkButton>
          <LinkButton to="/adhesion/suivi" variant="secondary">Suivre un dossier déposé</LinkButton>
        </div>
        {draft && <p className="item__meta" style={{ marginTop: 'var(--space-3)' }}>Une demande est en cours dans ce navigateur.</p>}
      </div>

      <section className="panel" aria-labelledby="qui">
        <h2 id="qui" className="panel__title">Qui peut demander l’adhésion ?</h2>
        <p>{r.eligibility.intro}</p>
        <ul>{r.eligibility.criteria.map((c) => <li key={c}>{c}</li>)}</ul>
        {upcoming.length > 0 && (
          <p className="item__meta">Seule la catégorie « Organisation » est ouverte pour l’instant. Les autres catégories ouvriront plus tard : {upcoming.map((c) => c.label).join(' ; ')}.</p>
        )}
      </section>

      <section className="panel" aria-labelledby="etapes">
        <h2 id="etapes" className="panel__title">Comment ça se passe ?</h2>
        <ol className="steps-list">{r.procedure.map((p) => <li key={p}>{p}</li>)}</ol>
      </section>

      <section className="panel" aria-labelledby="pieces">
        <h2 id="pieces" className="panel__title">Pièces à préparer</h2>
        <p>Au format PDF, JPG ou PNG, 10 Mo au maximum par fichier.</p>
        <ul className="plain-list">
          {r.documents.map((d) => (
            <li key={d.type}>
              <span className="item__title">{d.label}</span>
              <span className="item__meta">{REQUIREMENT_LABELS[d.requirement]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="conditions">
        <h2 id="conditions" className="panel__title">À savoir</h2>
        <ul>{r.conditions.map((c) => <li key={c}>{c}</li>)}</ul>
      </section>

      {r.fees.length > 0 && (
        <section className="panel" aria-labelledby="droits">
          <h2 id="droits" className="panel__title">Droits d’adhésion</h2>
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Barème des droits</caption>
              <thead><tr><th scope="col">Droit</th><th scope="col">Montant</th></tr></thead>
              <tbody>
                {r.fees.map((f) => (
                  <tr key={f.code}><th scope="row" style={{ background: 'none' }}>{f.label}</th><td>{formatFcfa(f.amountFcfa)} {PERIODICITY[f.periodicity] ?? ''}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="item__meta">{r.feesNotice}</p>
        </section>
      )}

      <div className="row">
        <LinkButton to="/adhesion/demande">{draft ? 'Continuer ma demande' : 'Commencer ma demande'}</LinkButton>
        <Link to="/">Retour à l’accueil</Link>
      </div>
    </div>
  );
}

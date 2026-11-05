import { homePathFor, useAuth } from '../auth/AuthContext';
import { usePageTitle } from '../lib/usePageTitle';
import { site } from '../lib/site';
import { LinkButton } from '../ui/Button';

export function HomePage() {
  usePageTitle('Accueil');
  const { user, status, can } = useAuth();
  const connected = !!user;
  const base = user && !user.organizationId ? '/admin' : '/espace';

  return (
    <>
      <section className="hero" aria-labelledby="titre-accueil">
        <div className="hero__inner">
          <div>
            <h1 id="titre-accueil">Les associations de personnes handicapées, réunies au même endroit</h1>
            <p className="hero__lead">
              {connected
                ? `Bonjour ${user.firstName}. Retrouvez votre espace ${site.fullName} : communications, documents, opportunités et agenda.`
                : `La ${site.fullName} accompagne ses organisations membres. Retrouvez ici votre espace, ou déposez votre demande d’adhésion.`}
            </p>
            {/* Pendant la vérification de la session, aucun bouton : on évite d'afficher « Se connecter » à quelqu'un déjà connecté. */}
            {status !== 'loading' && (
              <div className="row">
                {connected
                  ? <LinkButton to={homePathFor(user)}>Aller à mon espace</LinkButton>
                  : <>
                      <LinkButton to="/connexion">Se connecter</LinkButton>
                      <LinkButton to="/adhesion" variant="secondary">Adhérer à la CAPH-CI</LinkButton>
                    </>}
              </div>
            )}
          </div>
          <img className="hero__logo" src="/logo.png" alt="Logo de la CAPH-CI : des personnes réunies autour d’une personne en fauteuil roulant, sur la carte de la Côte d’Ivoire" width="352" height="291" />
        </div>
      </section>

      <div className="container">
        <h2>Que souhaitez-vous faire ?</h2>
        <div className="choices">
          {connected ? (
            <>
              <section className="panel choice" aria-labelledby="c-espace">
                <h3 id="c-espace">Mon espace</h3>
                <p>Votre tableau de bord : ce qui demande votre attention aujourd’hui.</p>
                <LinkButton to={homePathFor(user)} variant="secondary">Ouvrir le tableau de bord</LinkButton>
              </section>
              <section className="panel choice" aria-labelledby="c-contenus">
                <h3 id="c-contenus">Les contenus de la CAPH-CI</h3>
                <p>Documents, opportunités et rendez-vous mis à disposition des organisations.</p>
                <div className="row">
                  {can('document.read') && <LinkButton to={`${base}/documents`} variant="secondary">Documents</LinkButton>}
                  {can('opportunity.read') && <LinkButton to={`${base}/opportunites`} variant="secondary">Opportunités</LinkButton>}
                  {can('event.read') && <LinkButton to={`${base}/agenda`} variant="secondary">Agenda</LinkButton>}
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="panel choice" aria-labelledby="c-membre">
                <h3 id="c-membre">Accéder à mon espace</h3>
                <p>Pour les organisations déjà membres : communications, documents, opportunités, agenda et rapports.</p>
                <LinkButton to="/connexion" variant="secondary">Se connecter</LinkButton>
              </section>
              <section className="panel choice" aria-labelledby="c-adhesion">
                <h3 id="c-adhesion">Demander l’adhésion</h3>
                <p>Pour les associations qui souhaitent rejoindre la Coordination : conditions, pièces à fournir et dépôt du dossier.</p>
                <div className="row"><LinkButton to="/adhesion" variant="secondary">Voir comment adhérer</LinkButton><LinkButton to="/adhesion/suivi" variant="secondary">Suivre mon dossier</LinkButton></div>
              </section>
            </>
          )}
          <section className="panel choice" aria-labelledby="c-annuaire">
            <h3 id="c-annuaire">Trouver une organisation</h3>
            <p>L’annuaire des organisations membres qui ont accepté d’y figurer.</p>
            <LinkButton to="/annuaire" variant="secondary">Consulter l’annuaire</LinkButton>
          </section>
        </div>
      </div>
    </>
  );
}

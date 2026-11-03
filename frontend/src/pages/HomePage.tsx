import { usePageTitle } from '../lib/usePageTitle';
import { site } from '../lib/site';
import { LinkButton } from '../ui/Button';

export function HomePage() {
  usePageTitle('Accueil');
  return (
    <>
      <section className="hero" aria-labelledby="titre-accueil">
        <div className="hero__inner">
          <div>
            <h1 id="titre-accueil">Les associations de personnes handicapées, réunies au même endroit</h1>
            <p className="hero__lead">
              La {site.fullName} accompagne ses organisations membres. Retrouvez ici votre espace, ou déposez votre demande d’adhésion.
            </p>
            <div className="row">
              <LinkButton to="/connexion">Se connecter</LinkButton>
              <LinkButton to="/adhesion" variant="secondary">Adhérer à la CAPH-CI</LinkButton>
            </div>
          </div>
          <img className="hero__logo" src="/logo.png" alt="Logo de la CAPH-CI : des personnes réunies autour d’une personne en fauteuil roulant, sur la carte de la Côte d’Ivoire" width="352" height="291" />
        </div>
      </section>

      <div className="container">
        <h2>Que souhaitez-vous faire ?</h2>
        <div className="choices">
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

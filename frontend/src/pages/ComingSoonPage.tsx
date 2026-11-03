import { usePageTitle } from '../lib/usePageTitle';
import { LinkButton } from '../ui/Button';

export function ComingSoonPage({ title }: { title: string }) {
  usePageTitle(title);
  return (
    <div className="container container--narrow">
      <h1>{title}</h1>
      <p>Cette page est en cours de construction. Elle sera disponible dans une prochaine version du site.</p>
      <LinkButton to="/" variant="secondary">Retour à l’accueil</LinkButton>
    </div>
  );
}

export function NotFoundPage() {
  usePageTitle('Page introuvable');
  return (
    <div className="container container--narrow">
      <h1>Page introuvable</h1>
      <p>L’adresse demandée n’existe pas ou a été déplacée. Vérifiez l’adresse, ou revenez à l’accueil.</p>
      <LinkButton to="/">Aller à l’accueil</LinkButton>
    </div>
  );
}

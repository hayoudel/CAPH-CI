import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Flèche « Retour » présente sur toutes les pages (sauf la première page de chaque espace).
 * Elle revient à la page précédente ; si la personne est arrivée directement sur cette page
 * (lien reçu par e-mail, signet…), elle mène à la page d'accueil de l'espace.
 */
export function BackLink({ fallback }: { fallback: string }) {
  const navigate = useNavigate();
  const { pathname, key } = useLocation();
  if (pathname === fallback) return null;
  const go = () => (key !== 'default' ? navigate(-1) : navigate(fallback));
  return (
    <button type="button" className="back-link" onClick={go} aria-label="Retour à la page précédente">
      <span aria-hidden="true">←</span> Retour
    </button>
  );
}

import { Button } from './Button';

/** Pagination simple : précédent / suivant, avec le numéro de page. */
export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Page précédente</Button>
      <span>Page {page} sur {pages}</span>
      <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>Page suivante</Button>
    </nav>
  );
}

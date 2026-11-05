/** Repère les contenus fictifs : ils ne sont jamais présentés comme de vraies initiatives de la CAPH-CI. */
export function DemoBadge({ show }: { show?: boolean }) {
  return show ? <p className="demo-tag">Données de démonstration</p> : null;
}

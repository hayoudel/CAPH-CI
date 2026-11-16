import type { StatusHistoryEntry } from '../api/types';
import { formatDate } from '../lib/format';

/** Historique des décisions : chaque changement de statut avec sa date et l'éventuelle observation du personnel. */
export function History({ entries }: { entries: StatusHistoryEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="panel" aria-labelledby="hist">
      <h2 id="hist" className="panel__title">Historique du dossier</h2>
      <ol className="history">
        {entries.map((h) => (
          <li key={h.id}>
            <strong>{h.statusLabel}</strong> <span className="item__meta">le {formatDate(h.date)}</span>
            {h.note && <p className="history__note">{h.note}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}

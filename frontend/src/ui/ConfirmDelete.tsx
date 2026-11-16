import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Button } from './Button';
import { errorNotice, Flash, type Notice } from './Flash';
import { Modal } from './Modal';
import { useState } from 'react';

/** Boutons « Modifier » et « Supprimer » d'une carte de liste (affichés seulement à qui en a le droit). */
export function ItemActions({ title, onEdit, onDelete }: { title: string; onEdit?: () => void; onDelete: () => void }) {
  return (
    <div className="form-actions item-actions">
      {onEdit && <Button variant="secondary" className="btn--sm" aria-label={`Modifier « ${title} »`} onClick={onEdit}>Modifier</Button>}
      <Button variant="ghost" className="btn--sm" aria-label={`Supprimer « ${title} »`} onClick={onDelete}>Supprimer</Button>
    </div>
  );
}

/**
 * Fenêtre de confirmation avant suppression. Appelle `DELETE path`, rafraîchit les listes (`invalidate`) et le tableau de bord,
 * puis `onDone` avec le message à afficher sur la page. Une erreur reste affichée dans la fenêtre.
 */
/** Accord en genre : article devant le nom et participe passé. */
const GENDER: Record<string, { det: string; done: string }> = {
  Document: { det: 'ce', done: 'supprimé' }, Opportunité: { det: 'cette', done: 'supprimée' }, Événement: { det: 'cet', done: 'supprimé' },
  Rapport: { det: 'ce', done: 'supprimé' }, Actualité: { det: 'cette', done: 'supprimée' },
};

export function ConfirmDelete({ title, what, path, invalidate, onClose, onDone, note }: {
  title: string; what: string; path: string; invalidate: string[]; onClose: () => void; onDone: (n: Notice) => void; note?: string;
}) {
  const qc = useQueryClient();
  const g = GENDER[what] ?? { det: 'ce', done: 'supprimé' };
  const [notice, setNotice] = useState<Notice | null>(null);
  const del = useMutation({
    mutationFn: () => api(path, { method: 'DELETE' }),
    onSuccess: () => {
      for (const k of [...invalidate, 'dashboard']) void qc.invalidateQueries({ queryKey: [k] });
      onDone({ kind: 'success', title: `${what} ${g.done}`, text: title });
    },
    onError: (e) => setNotice(errorNotice(e, 'Suppression impossible')),
  });
  return (
    <Modal title={`Supprimer ${g.det} ${what.toLowerCase()} ?`} onClose={onClose}>
      <Flash notice={notice} />
      <p><strong>{title}</strong></p>
      <p>{note ?? 'Cette action est définitive pour votre organisation.'}</p>
      <div className="form-actions">
        <Button variant="danger" loading={del.isPending} onClick={() => { setNotice(null); del.mutate(); }}>Oui, supprimer</Button>
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
      </div>
    </Modal>
  );
}

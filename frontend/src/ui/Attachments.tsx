import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ChangeEvent } from 'react';
import { api } from '../api/client';
import type { Attachment } from '../api/types';
import { formatSize } from '../lib/format';
import { Button } from './Button';
import { DownloadButton } from './DownloadButton';
import { errorNotice, Flash, type Notice } from './Flash';

export const MAX_ATTACHMENTS = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const OK_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/** Vérifie un fichier avant envoi : on évite un aller-retour inutile quand il est trop gros ou d'un mauvais type. */
export function checkFile(f: { size: number; type: string; name: string }): string | null {
  if (!OK_TYPES.includes(f.type) && !/\.(pdf|jpe?g|png)$/i.test(f.name)) return 'Ce type de fichier n’est pas accepté. Choisissez un PDF, une image JPG ou PNG.';
  if (f.size > MAX_FILE_BYTES) return 'Ce fichier dépasse 10 Mo. Choisissez un fichier plus léger.';
  return null;
}

/** Pièces jointes d'un rapport ou d'une actualité : télécharger, retirer, ajouter (5 maximum). */
export function Attachments({ basePath, queryKey, items, editable }: { basePath: string; queryKey: unknown[]; items: Attachment[]; editable: boolean }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey });

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const problem = checkFile(file);
    if (problem) { setNotice({ kind: 'error', title: 'Fichier refusé', text: problem }); e.target.value = ''; return; }
    setBusy('add'); setNotice(null);
    try {
      const body = new FormData(); body.append('file', file);
      await api(`${basePath}/attachments`, { method: 'POST', body });
      await refresh();
      setNotice({ kind: 'success', title: 'Fichier ajouté', text: file.name });
    } catch (err) { setNotice(errorNotice(err, 'Envoi impossible')); } finally { setBusy(null); e.target.value = ''; }
  }

  async function remove(a: Attachment) {
    setBusy(a.id); setNotice(null);
    try {
      await api(`${basePath}/attachments/${a.id}`, { method: 'DELETE' });
      await refresh();
      setNotice({ kind: 'success', title: 'Fichier retiré', text: a.originalName });
    } catch (err) { setNotice(errorNotice(err, 'Suppression impossible')); } finally { setBusy(null); }
  }

  const full = items.length >= MAX_ATTACHMENTS;
  return (
    <section className="panel" aria-labelledby="pj">
      <h2 id="pj" className="panel__title">Pièces jointes</h2>
      <Flash notice={notice} />
      {items.length === 0 ? <p className="empty">Aucune pièce jointe.</p> : (
        <ul className="plain-list">
          {items.map((a) => (
            <li key={a.id}>
              <span className="item__title">{a.originalName}</span>
              <span className="item__meta">{formatSize(a.sizeBytes)}</span>
              <div className="row" style={{ marginTop: 'var(--space-2)' }}>
                <DownloadButton path={`${basePath}/attachments/${a.id}/file`} name={a.originalName} label={`Télécharger ${a.originalName}`} />
                {editable && <Button variant="secondary" loading={busy === a.id} onClick={() => remove(a)} aria-label={`Retirer ${a.originalName}`}>Retirer</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          {full ? <p className="item__meta">Vous avez atteint le maximum de {MAX_ATTACHMENTS} pièces jointes. Retirez-en une pour en ajouter une autre.</p> : (
            <>
              <label htmlFor="pj-input" className="field__label">Ajouter un fichier</label>
              <input ref={input} id="pj-input" type="file" className="file-input" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                aria-describedby="pj-hint" disabled={busy === 'add'} onChange={upload} />
              <div id="pj-hint" className="field__hint">PDF, JPG ou PNG, 10 Mo maximum. {MAX_ATTACHMENTS - items.length} sur {MAX_ATTACHMENTS} encore possible{MAX_ATTACHMENTS - items.length > 1 ? 's' : ''}.</div>
              {busy === 'add' && <p role="status">Envoi en cours…</p>}
            </>
          )}
        </div>
      )}
    </section>
  );
}

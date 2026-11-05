import { useQueryClient } from '@tanstack/react-query';
import { useState, type ChangeEvent } from 'react';
import { api } from '../api/client';
import { Button } from './Button';
import { AuthImage } from './AuthImage';
import { checkFile } from './Attachments';
import { errorNotice, Flash, type Notice } from './Flash';

const IMAGE_OK = /\.(jpe?g|png)$/i;
/** Une image de couverture est un JPG ou un PNG de 10 Mo maximum. */
export function checkCover(f: { size: number; name: string }): string | null {
  if (!IMAGE_OK.test(f.name)) return 'L’image de couverture doit être au format JPG ou PNG.';
  return checkFile({ name: f.name, size: f.size, type: '' });
}

export const uploadFile = (path: string, f: File) => { const body = new FormData(); body.append('file', f); return api(path, { method: 'POST', body }); };

/** Image de couverture d'un élément déjà enregistré : l'afficher, la remplacer ou la retirer (si `editable`). */
export function CoverEditor({ basePath, hasCover, version, alt, queryKey, editable }: {
  basePath: string; hasCover: boolean; version: string; alt: string; queryKey: unknown[]; editable: boolean;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  async function change(ev: ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    ev.target.value = '';
    if (!f) return;
    const problem = checkCover(f);
    if (problem) { setNotice({ kind: 'error', title: 'Image refusée', text: problem }); return; }
    setBusy(true); setNotice(null);
    try { await uploadFile(`${basePath}/cover`, f); await qc.invalidateQueries({ queryKey }); } catch (e) { setNotice(errorNotice(e, 'Envoi impossible')); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setNotice(null);
    try { await api(`${basePath}/cover`, { method: 'DELETE' }); await qc.invalidateQueries({ queryKey }); } catch (e) { setNotice(errorNotice(e, 'Suppression impossible')); } finally { setBusy(false); }
  }
  if (!hasCover && !editable) return null;
  return (
    <section className="panel" aria-labelledby="cover-h">
      <h2 id="cover-h" className="panel__title">Image de couverture</h2>
      <Flash notice={notice} />
      {hasCover ? <AuthImage key={version} className="cover--small" path={`${basePath}/cover`} alt={alt} /> : <p className="empty">Aucune image de couverture.</p>}
      {editable && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <label htmlFor="cover-input" className="field__label">{hasCover ? 'Remplacer l’image' : 'Ajouter une image'}</label>
          <input id="cover-input" type="file" className="file-input" accept=".jpg,.jpeg,.png,image/jpeg,image/png" disabled={busy} onChange={(e) => void change(e)} />
          {hasCover && <p><Button variant="secondary" loading={busy} onClick={() => void remove()}>Retirer l’image</Button></p>}
        </div>
      )}
    </section>
  );
}

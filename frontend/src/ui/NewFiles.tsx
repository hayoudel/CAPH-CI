import { useState, type ChangeEvent } from 'react';
import { api } from '../api/client';
import { formatSize } from '../lib/format';
import { checkFile, MAX_ATTACHMENTS } from './Attachments';

export interface NewFiles { extra: File[] }
export const noFiles: NewFiles = { extra: [] };

const upload = (path: string, f: File) => { const body = new FormData(); body.append('file', f); return api(path, { method: 'POST', body }); };

/** Envoie les pièces choisies sur un élément qui vient d'être créé ; renvoie les noms des fichiers en échec (rien n'est annulé). */
export async function uploadNewFiles(basePath: string, files: NewFiles): Promise<string[]> {
  const failed: string[] = [];
  for (const f of files.extra) { try { await upload(`${basePath}/attachments`, f); } catch { failed.push(f.name); } }
  return failed;
}

/** Choix de pièces jointes facultatives dans un formulaire de création (envoyées après l'enregistrement). */
export function NewFilesPicker({ files, onChange, label = 'Pièces jointes (facultatif)' }: { files: NewFiles; onChange: (f: NewFiles) => void; label?: string }) {
  const [error, setError] = useState<string | null>(null);
  function pick(ev: ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    ev.target.value = '';
    if (!f) return;
    const problem = checkFile(f);
    if (problem) { setError(problem); return; }
    if (files.extra.length >= MAX_ATTACHMENTS) { setError(`${MAX_ATTACHMENTS} documents au maximum.`); return; }
    setError(null); onChange({ extra: [...files.extra, f] });
  }
  return (
    <div className="field">
      <label className="field__label" htmlFor="new-extra">{label}</label>
      <input id="new-extra" type="file" className="file-input" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" aria-describedby="new-extra-hint" onChange={pick} />
      <div className="field__hint" id="new-extra-hint">PDF, JPG ou PNG, 10 Mo maximum chacun, {MAX_ATTACHMENTS} au maximum. Ajoutez-les un par un.</div>
      {files.extra.length > 0 && (
        <ul className="file-list" aria-label="Fichiers choisis">
          {files.extra.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <span>{f.name} <span className="item__meta">({formatSize(f.size)})</span></span>
              <button type="button" className="link-btn" aria-label={`Retirer ${f.name}`} onClick={() => onChange({ extra: files.extra.filter((_, j) => j !== i) })}>Retirer</button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="field__error" role="alert">{error}</p>}
    </div>
  );
}

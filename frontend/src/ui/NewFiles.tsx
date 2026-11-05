import { useState, type ChangeEvent } from 'react';
import { formatSize } from '../lib/format';
import { checkFile, MAX_ATTACHMENTS } from './Attachments';
import { checkCover, uploadFile } from './CoverEditor';

export interface NewFiles { cover: File | null; extra: File[] }
export const noFiles: NewFiles = { cover: null, extra: [] };

/** Envoie l'image et les pièces choisies sur un élément qui vient d'être créé ; renvoie les noms des fichiers en échec (rien n'est annulé). */
export async function uploadNewFiles(basePath: string, files: NewFiles): Promise<string[]> {
  const failed: string[] = [];
  if (files.cover) { try { await uploadFile(`${basePath}/cover`, files.cover); } catch { failed.push(files.cover.name); } }
  for (const f of files.extra) { try { await uploadFile(`${basePath}/attachments`, f); } catch { failed.push(f.name); } }
  return failed;
}

/** Choix de l'image de couverture et des pièces jointes dans un formulaire de création (envoyées après l'enregistrement). */
export function NewFilesPicker({ files, onChange, extraLabel = 'Pièces jointes (facultatif)' }: { files: NewFiles; onChange: (f: NewFiles) => void; extraLabel?: string }) {
  const [error, setError] = useState<string | null>(null);
  function pickCover(ev: ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    ev.target.value = '';
    if (!f) return;
    const problem = checkCover(f);
    if (problem) { setError(problem); return; }
    setError(null); onChange({ ...files, cover: f });
  }
  function pickExtra(ev: ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    ev.target.value = '';
    if (!f) return;
    const problem = checkFile(f);
    if (problem) { setError(problem); return; }
    if (files.extra.length >= MAX_ATTACHMENTS) { setError(`${MAX_ATTACHMENTS} documents au maximum.`); return; }
    setError(null); onChange({ ...files, extra: [...files.extra, f] });
  }
  return (
    <>
      <div className="field">
        <label className="field__label" htmlFor="new-cover">Image de couverture</label>
        <input id="new-cover" type="file" className="file-input" accept=".jpg,.jpeg,.png,image/jpeg,image/png" aria-describedby="new-cover-hint" onChange={pickCover} />
        <div className="field__hint" id="new-cover-hint">JPG ou PNG, 10 Mo maximum. Facultative pour un brouillon.</div>
        {files.cover && (
          <p className="item__meta" role="status">
            {files.cover.name} ({formatSize(files.cover.size)}){' '}
            <button type="button" className="link-btn" onClick={() => onChange({ ...files, cover: null })}>Retirer</button>
          </p>
        )}
      </div>
      <div className="field">
        <label className="field__label" htmlFor="new-extra">{extraLabel}</label>
        <input id="new-extra" type="file" className="file-input" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" aria-describedby="new-extra-hint" onChange={pickExtra} />
        <div className="field__hint" id="new-extra-hint">PDF, JPG ou PNG, 10 Mo maximum chacun, {MAX_ATTACHMENTS} au maximum. Ajoutez-les un par un.</div>
        {files.extra.length > 0 && (
          <ul className="file-list" aria-label="Fichiers choisis">
            {files.extra.map((f, i) => (
              <li key={`${f.name}-${i}`}>
                <span>{f.name} <span className="item__meta">({formatSize(f.size)})</span></span>
                <button type="button" className="link-btn" aria-label={`Retirer ${f.name}`} onClick={() => onChange({ ...files, extra: files.extra.filter((_, j) => j !== i) })}>Retirer</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="field__error" role="alert">{error}</p>}
    </>
  );
}

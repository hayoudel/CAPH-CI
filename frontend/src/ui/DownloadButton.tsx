import { useState } from 'react';
import { downloadFile } from '../api/client';
import { errorNotice, Flash, type Notice } from './Flash';
import { Button } from './Button';

/** Bouton qui télécharge un fichier protégé et affiche l'erreur éventuelle juste à côté. */
export function DownloadButton({ path, name, label, variant = 'secondary' }: { path: string; name: string; label: string; variant?: 'primary' | 'secondary' }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  async function go() {
    setBusy(true); setNotice(null);
    try { await downloadFile(path, name); } catch (e) { setNotice(errorNotice(e, 'Téléchargement impossible')); } finally { setBusy(false); }
  }
  return (
    <>
      <Button variant={variant} loading={busy} onClick={go}>{label}</Button>
      <Flash notice={notice} />
    </>
  );
}

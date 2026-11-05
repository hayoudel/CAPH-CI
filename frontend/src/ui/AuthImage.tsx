import { useEffect, useState } from 'react';
import { fetchBlobUrl } from '../api/client';

/** Image protégée (nécessite la session) : affichée dès qu'elle est chargée, sans rien casser si elle échoue. */
export function AuthImage({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null, cancelled = false;
    setSrc(null);
    fetchBlobUrl(path).then((u) => { if (cancelled) URL.revokeObjectURL(u); else { url = u; setSrc(u); } }).catch(() => undefined);
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [path]);
  if (!src) return <div className={`${className ?? ''} cover cover--empty`} role="img" aria-label={alt} />;
  return <img className={`${className ?? ''} cover`} src={src} alt={alt} />;
}

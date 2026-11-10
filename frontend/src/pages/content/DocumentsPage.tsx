import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { LibraryDocument, Paginated } from '../../api/types';
import { DOCUMENT_CATEGORIES, formatDate, formatSize } from '../../lib/format';
import { useListParams } from '../../lib/useListParams';
import { usePageTitle } from '../../lib/usePageTitle';
import { useAuth } from '../../auth/AuthContext';
import { Alert } from '../../ui/Alert';
import { Flash, type Notice } from '../../ui/Flash';
import { ReviewInfo } from '../../ui/Review';
import { AddDocumentModal } from './AddModals';
import { Button } from '../../ui/Button';
import { DownloadButton } from '../../ui/DownloadButton';
import { SelectField, TextField } from '../../ui/Field';
import { Pager } from '../../ui/Pager';
import { Spinner } from '../../ui/Spinner';

export function DocumentsPage() {
  usePageTitle('Documents');
  const f = useListParams();
  const { can } = useAuth();
  const manage = can('document.manage');
  const canAdd = manage || can('document.propose');
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [text, setText] = useState(f.get('q'));
  const query = { q: f.get('q') || undefined, category: f.get('category') || undefined, page: f.page, limit: 10 };
  const list = useQuery({ queryKey: ['documents', query], queryFn: () => api<Paginated<LibraryDocument>>('/documents', { query }), placeholderData: (p) => p });
  const submit = (e: FormEvent) => { e.preventDefault(); f.set('q', text.trim()); };
  const total = list.data?.meta.total ?? 0;
  const hasFilter = f.has('q', 'category');

  return (
    <>
      <header className="page-head page-head--actions">
        <div>
          <h1>Documents</h1>
          <p>Guides, formulaires et comptes rendus mis à disposition par la CAPH-CI.</p>
        </div>
        {canAdd && <div className="page-head__actions"><Button onClick={() => setAdding(true)}>+ Ajouter un document</Button></div>}
      </header>
      <Flash notice={notice} />
      {adding && <AddDocumentModal proposer={!manage} onClose={() => setAdding(false)} onDone={(n) => { setAdding(false); setNotice(n); }} />}
      <div className="stack">
        <form className="panel" role="search" aria-label="Rechercher un document" onSubmit={submit}>
          <div className="filters">
            <TextField label="Titre ou description" type="search" value={text} onChange={(e) => setText(e.target.value)} />
            <SelectField label="Catégorie" value={f.get('category')} placeholder="Toutes les catégories"
              options={Object.entries(DOCUMENT_CATEGORIES).map(([value, label]) => ({ value, label }))} onChange={(e) => f.set('category', e.target.value)} />
          </div>
          <div className="row row--end">
            {hasFilter && <Button variant="secondary" onClick={() => { setText(''); f.reset(); }}>Effacer la recherche</Button>}
            <Button type="submit">Rechercher</Button>
          </div>
        </form>

        <div aria-live="polite">
          {list.isLoading && <Spinner />}
          {list.isError && <Alert kind="error" title="Chargement impossible">{list.error.message}</Alert>}
          {list.data && <p><strong>{total}</strong> {total > 1 ? 'documents trouvés' : 'document trouvé'}</p>}
        </div>

        {list.data && total === 0 && <p className="empty">{hasFilter ? 'Aucun document ne correspond à votre recherche.' : 'Aucun document n’est disponible pour le moment.'}</p>}
        {list.data && total > 0 && (
          <ul className="stack-list">
            {list.data.data.map((d) => (
              <li key={d.id}>
                <article className="panel">
                  <h2 className="panel__title">{d.title}{d.isFeatured && <> <span className="badge badge--orange">À la une</span></>}</h2>
                  <p className="item__meta">
                    <span className="badge badge--grey">{DOCUMENT_CATEGORIES[d.category] ?? d.category}</span>{' '}
                    Publié le {formatDate(d.publishedAt)} — {d.file.originalName} ({formatSize(d.file.sizeBytes)})
                  </p>
                  {d.description && <p>{d.description}</p>}
                  <ReviewInfo item={d} />
                  <DownloadButton path={`/documents/${d.id}/file`} name={d.file.originalName} label={`Télécharger « ${d.title} »`} />
                </article>
              </li>
            ))}
          </ul>
        )}
        <Pager page={f.page} pages={list.data?.meta.totalPages ?? 1} onPage={(p) => f.set('page', String(p))} />
      </div>
    </>
  );
}

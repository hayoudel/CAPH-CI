import { useEffect, useRef, useState } from 'react';
import PageHero from '../components/PageHero';
import QueryState from '../components/QueryState';
import { useMedia } from '../hooks/queries';
import type { MediaItem } from '../types';

type Tab = 'photos' | 'videos';

const projectTags = ['EMPLOI+CI', 'Écoles inclusives', 'Forum emploi', 'Campagnes', 'Délégations', 'Partenariats'];

function MediaPageContent({ mediaItems }: { mediaItems: MediaItem[] }) {
  const [tab, setTab] = useState<Tab>('photos');
  const [selected, setSelected] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [search, setSearch] = useState('');

  const photos = mediaItems.filter(m => m.type === 'photo');
  const videos = mediaItems.filter(m => m.type === 'video');
  const current = tab === 'photos' ? photos : videos;

  const categories = Array.from(new Set(current.map(m => m.category)));
  const filtered = current.filter(m => {
    const matchCat = !catFilter || m.category === catFilter;
    const matchProject = !projectFilter || m.title.toLowerCase().includes(projectFilter.toLowerCase()) || m.category.toLowerCase().includes(projectFilter.toLowerCase());
    const matchSearch = !search || m.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchProject && matchSearch;
  });

  const selectedItem = mediaItems.find(m => m.id === selected);

  // Visionneuse accessible : Échap ferme, ←/→ naviguent, focus placé puis restitué.
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!selected) {
      triggerRef.current?.focus();
      triggerRef.current = null;
      return;
    }
    if (!triggerRef.current) triggerRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected(null);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        const index = filtered.findIndex(m => m.id === selected);
        if (index < 0 || filtered.length < 2) return;
        const step = event.key === 'ArrowRight' ? 1 : -1;
        setSelected(filtered[(index + step + filtered.length) % filtered.length].id);
      } else if (event.key === 'Tab') {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, filtered]);

  return (
    <>
      <PageHero
        title="Médiathèque"
        subtitle="Photos, vidéos, reportages, témoignages et campagnes de la CAPH-CI et de ses délégations."
        breadcrumbs={[{ label: 'Médiathèque' }]}
      />

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-0" role="tablist">
            {[{ key: 'photos' as Tab, label: `Photos (${photos.length})` }, { key: 'videos' as Tab, label: `Vidéos (${videos.length})` }].map(t => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => { setTab(t.key); setCatFilter(''); setSelected(null); }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
              >{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {selected && selectedItem && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label={selectedItem.title}
        >
          <div className="max-w-4xl w-full bg-white rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="relative">
              <img src={selectedItem.src} alt={selectedItem.title} className="w-full h-80 object-cover" />
              {selectedItem.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                    <span className="text-2xl ml-1" aria-hidden="true">▶</span>
                  </div>
                </div>
              )}
              {selectedItem.subtitles && (
                <div className="absolute bottom-3 right-3">
                  <span className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold">CC</span>
                </div>
              )}
            </div>
            <div className="p-6 flex items-start justify-between">
              <div>
                <div className="flex gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{selectedItem.category}</span>
                  <span className="text-slate-400 text-xs">{selectedItem.date}</span>
                  {selectedItem.duration && <span className="text-slate-400 text-xs">{selectedItem.duration}</span>}
                </div>
                <h3 className="font-bold text-slate-900 font-display">{selectedItem.title}</h3>
              </div>
              <button ref={closeRef} onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600" aria-label="Fermer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          {/* Search + project filter bar */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex-1 min-w-52">
              <label htmlFor="media-search" className="sr-only">Rechercher dans la médiathèque</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  id="media-search"
                  type="search"
                  placeholder="Rechercher un titre..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:border-blue-500 outline-none"
              aria-label="Filtrer par projet"
            >
              <option value="">Tous les projets</option>
              {projectTags.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {(search || projectFilter || catFilter) && (
              <button
                onClick={() => { setSearch(''); setProjectFilter(''); setCatFilter(''); }}
                className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {/* Category filters */}
          <div className="flex gap-2 mb-8 overflow-x-auto flex-wrap">
            <button onClick={() => setCatFilter('')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${!catFilter ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Tout</button>
            {categories.map(c => (
              <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${catFilter === c ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{c}</button>
            ))}
          </div>

          <p className="text-slate-500 text-sm mb-6">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</p>

          {/* Photo gallery */}
          {tab === 'photos' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(photo => (
                <button
                  key={photo.id}
                  onClick={() => setSelected(photo.id)}
                  className="group relative rounded-xl overflow-hidden aspect-video bg-slate-100"
                  aria-label={`Voir la photo : ${photo.title}`}
                >
                  <img src={photo.src} alt={photo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="text-xs text-white/80 mb-1">{photo.category} · {photo.date}</div>
                      <div className="text-sm font-semibold text-white font-display line-clamp-1">{photo.title}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Video gallery */}
          {tab === 'videos' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(video => (
                <button
                  key={video.id}
                  onClick={() => setSelected(video.id)}
                  className="group text-left rounded-xl overflow-hidden border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  aria-label={`Voir la vidéo : ${video.title}`}
                >
                  <div className="relative aspect-video bg-slate-100 overflow-hidden">
                    <img src={video.src} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center" aria-hidden="true">
                      <div className="w-12 h-12 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center transition-colors shadow-lg">
                        <span className="text-lg ml-0.5">▶</span>
                      </div>
                    </div>
                    {video.subtitles && (
                      <div className="absolute bottom-2 right-2">
                        <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-xs font-bold" title="Sous-titres disponibles">CC</span>
                      </div>
                    )}
                    {video.duration && (
                      <div className="absolute bottom-2 left-2">
                        <span className="px-2 py-0.5 rounded bg-black/60 text-white text-xs">{video.duration}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs">{video.category}</span>
                      <span className="text-slate-400 text-xs">{video.date}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 font-display text-sm line-clamp-2">{video.title}</h3>
                    {video.subtitles && <p className="text-slate-400 text-xs mt-1">✓ Sous-titres disponibles</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <div className="text-5xl mb-4">{tab === 'photos' ? '🖼️' : '🎥'}</div>
              <p>Aucun contenu ne correspond à votre recherche.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function MediaPage(props: Omit<Parameters<typeof MediaPageContent>[0], 'mediaItems'>) {
  const q_mediaItems = useMedia();
  return (
    <QueryState queries={[q_mediaItems]}>
      {() => <MediaPageContent {...props} mediaItems={q_mediaItems.data!} />}
    </QueryState>
  );
}

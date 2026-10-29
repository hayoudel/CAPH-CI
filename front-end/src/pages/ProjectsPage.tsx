import { useState } from 'react';
import PageHero from '../components/PageHero';
import { useNavigation } from '../context/NavigationContext';
import QueryState from '../components/QueryState';
import { useDomains, useNews, useProjects } from '../hooks/queries';
import type { Domain, NewsItem, Project } from '../types';

const statusColor = (s: string) =>
  s === 'En cours' ? 'bg-green-100 text-green-700' : s === 'Terminé' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700';

type Props = { detail?: boolean };

function ProjectsPageContent({ detail, projects, domains, newsItems }: Props & { projects: Project[]; domains: Domain[]; newsItems: NewsItem[] }) {
  const { navigate, selectedId } = useNavigation();
  const [domainFilter, setDomainFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [mediaTab, setMediaTab] = useState<'photos' | 'videos'>('photos');

  const project = projects.find(p => p.id === selectedId);

  if (detail && project) {
    const photos = project.media?.filter(m => m.type === 'photo') ?? [
      { id: `${project.id}-cover`, type: 'photo' as const, title: project.title, src: project.image },
    ];
    const videos = project.media?.filter(m => m.type === 'video') ?? [];
    const allMedia = [...photos, ...videos];
    const lightboxItem = allMedia.find(m => m.id === lightboxId);
    const relatedNews = newsItems.filter(item => project.relatedNewsIds.includes(item.id));

    return (
      <>
        <PageHero
          title={project.title}
          subtitle={`${project.domain} · ${project.region}`}
          breadcrumbs={[{ label: 'Projets', page: 'projects' }, { label: project.title }]}
        />

        {/* Lightbox */}
        {lightboxId && lightboxItem && (
          <div
            className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
            onClick={() => setLightboxId(null)}
            role="dialog"
            aria-modal="true"
            aria-label={lightboxItem.title}
          >
            <div className="max-w-4xl w-full" onClick={e => e.stopPropagation()}>
              <div className="relative rounded-xl overflow-hidden bg-black">
                <img src={lightboxItem.src} alt={lightboxItem.title} className="w-full max-h-[72vh] object-contain" />
                {lightboxItem.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                      <span className="text-3xl ml-1.5" aria-hidden="true">▶</span>
                    </div>
                  </div>
                )}
                {lightboxItem.subtitles && (
                  <div className="absolute bottom-3 right-3">
                    <span className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold">CC</span>
                  </div>
                )}
                {lightboxItem.duration && (
                  <div className="absolute bottom-3 left-3">
                    <span className="px-2 py-1 rounded bg-black/60 text-white text-xs">{lightboxItem.duration}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-white font-bold font-display">{lightboxItem.title}</h3>
                  {lightboxItem.type === 'video' && lightboxItem.subtitles && (
                    <p className="text-white/60 text-xs mt-1">✓ Sous-titres disponibles</p>
                  )}
                </div>
                <button
                  onClick={() => setLightboxId(null)}
                  className="flex-shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Fermer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-10">
                {/* Hero image */}
                <div className="rounded-2xl overflow-hidden">
                  <img src={project.image} alt={project.title} className="w-full h-72 object-cover" />
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${statusColor(project.status)}`}>{project.status}</span>
                  <span className="px-3 py-1.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">{project.domain}</span>
                  <span className="px-3 py-1.5 rounded-full text-xs bg-slate-100 text-slate-600">{project.region}</span>
                  <span className="px-3 py-1.5 rounded-full text-xs bg-slate-100 text-slate-600">{project.year}</span>
                </div>

                {/* Project overview */}
                <section aria-labelledby="presentation-title">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">Présentation</p>
                  <h2 id="presentation-title" className="text-2xl font-bold text-slate-900 font-display mb-4">Le projet en bref</h2>
                  <p className="text-slate-600 leading-relaxed">{project.description}</p>
                </section>

                <div className="grid md:grid-cols-2 gap-5">
                  <section className="rounded-xl border border-slate-200 p-6" aria-labelledby="objectives-title">
                    <h2 id="objectives-title" className="text-lg font-bold text-slate-900 font-display mb-4">Objectifs</h2>
                    <ul className="space-y-3">
                      {project.objectives.map(item => (
                        <li key={item} className="flex gap-3 text-slate-600 text-sm leading-relaxed">
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="rounded-xl bg-blue-50 border border-blue-200 p-6" aria-labelledby="beneficiaries-title">
                    <h2 id="beneficiaries-title" className="text-lg font-bold text-slate-900 font-display mb-4">Bénéficiaires</h2>
                    <p className="text-4xl font-extrabold text-blue-700 font-display">{project.beneficiaries.toLocaleString('fr-FR')}</p>
                    <p className="text-sm font-medium text-slate-700 mt-1">personnes ciblées</p>
                    <p className="text-sm text-slate-600 mt-4">{project.target}</p>
                  </section>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <section className="rounded-xl border border-slate-200 p-6" aria-labelledby="activities-title">
                    <h2 id="activities-title" className="text-lg font-bold text-slate-900 font-display mb-4">Activités principales</h2>
                    <ol className="space-y-3">
                      {project.activities.map((item, index) => (
                        <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0" aria-hidden="true">{index + 1}</span>
                          <span className="pt-0.5">{item}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                  <section className="rounded-xl border border-slate-200 p-6" aria-labelledby="results-title">
                    <h2 id="results-title" className="text-lg font-bold text-slate-900 font-display mb-4">Résultats</h2>
                    <ul className="space-y-3">
                      {project.results.map(item => (
                        <li key={item} className="flex gap-3 text-sm text-slate-600">
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                {/* Media gallery */}
                <section aria-labelledby="media-title">
                    <div className="flex items-center justify-between mb-5">
                      <h2 id="media-title" className="text-xl font-bold text-slate-900 font-display">Photos et vidéos</h2>
                      <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
                        <button
                          onClick={() => setMediaTab('photos')}
                          className={`px-4 py-1.5 font-medium transition-colors ${mediaTab === 'photos' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          Photos ({photos.length})
                        </button>
                        <button
                          onClick={() => setMediaTab('videos')}
                          className={`px-4 py-1.5 font-medium transition-colors ${mediaTab === 'videos' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          Vidéos ({videos.length})
                        </button>
                      </div>
                    </div>

                    {mediaTab === 'photos' && photos.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {photos.map(photo => (
                          <button
                            key={photo.id}
                            onClick={() => setLightboxId(photo.id)}
                            className="group relative rounded-xl overflow-hidden aspect-video bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500"
                            aria-label={`Agrandir la photo : ${photo.title}`}
                          >
                            <img src={photo.src} alt={photo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-white text-xs font-medium line-clamp-2">{photo.title}</p>
                              </div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
                                  <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {mediaTab === 'videos' && videos.length > 0 && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {videos.map(video => (
                          <button
                            key={video.id}
                            onClick={() => setLightboxId(video.id)}
                            className="group text-left rounded-xl overflow-hidden border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all focus-visible:ring-2 focus-visible:ring-blue-500"
                            aria-label={`Lire la vidéo : ${video.title}`}
                          >
                            <div className="relative aspect-video bg-slate-100 overflow-hidden">
                              <img src={video.src} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-black/25 flex items-center justify-center" aria-hidden="true">
                                <div className="w-14 h-14 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center transition-colors shadow-lg">
                                  <span className="text-2xl ml-1">▶</span>
                                </div>
                              </div>
                              {video.subtitles && (
                                <div className="absolute bottom-2 right-2">
                                  <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-xs font-bold">CC</span>
                                </div>
                              )}
                              {video.duration && (
                                <div className="absolute bottom-2 left-2">
                                  <span className="px-2 py-0.5 rounded bg-black/60 text-white text-xs">{video.duration}</span>
                                </div>
                              )}
                            </div>
                            <div className="p-4">
                              <h3 className="font-bold text-slate-900 font-display text-sm line-clamp-2">{video.title}</h3>
                              {video.subtitles && <p className="text-slate-400 text-xs mt-1">✓ Sous-titres disponibles</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {mediaTab === 'videos' && videos.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                        <p className="text-sm font-medium text-slate-700">Aucune vidéo publiée pour le moment</p>
                        <p className="text-xs text-slate-500 mt-1">Les reportages et témoignages liés au projet seront ajoutés ici.</p>
                      </div>
                    )}
                </section>

                {/* Documents */}
                  <section aria-labelledby="documents-title">
                    <h2 id="documents-title" className="text-xl font-bold text-slate-900 font-display mb-5">Documents du projet</h2>
                    <div className="space-y-3">
                      {project.docs?.map(doc => (
                        <div key={doc.id} className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors bg-white">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center" aria-hidden="true">
                            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-slate-900 text-sm font-display">{doc.title}</h3>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="text-xs text-blue-600 font-medium">{doc.type}</span>
                                  <span className="text-xs text-slate-400">{doc.date}</span>
                                  {doc.size && <span className="text-xs text-slate-400">{doc.size}</span>}
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors">
                                  Consulter
                                </button>
                                {doc.downloadable && (
                                  <button className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Télécharger
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{doc.description}</p>
                          </div>
                        </div>
                      ))}
                      {!project.docs?.length && (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                          <p className="text-sm font-medium text-slate-700">Aucun document public disponible</p>
                          <p className="text-xs text-slate-500 mt-1">Les rapports, fiches et publications seront mis en ligne prochainement.</p>
                        </div>
                      )}
                    </div>
                  </section>

                <section aria-labelledby="news-title">
                  <div className="flex items-end justify-between gap-4 mb-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">À suivre</p>
                      <h2 id="news-title" className="text-xl font-bold text-slate-900 font-display">Actualités associées</h2>
                    </div>
                    <button onClick={() => navigate('news')} className="text-sm font-semibold text-blue-700 hover:underline">Toutes les actualités</button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {relatedNews.map(item => (
                      <button key={item.id} onClick={() => navigate('news-detail', item.id)} className="group text-left overflow-hidden rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all">
                        <img src={item.image} alt="" className="w-full h-32 object-cover" />
                        <div className="p-4">
                          <div className="text-xs font-medium text-blue-600 mb-1">{item.category} · {item.date}</div>
                          <h3 className="text-sm font-bold text-slate-900 font-display line-clamp-2">{item.title}</h3>
                          <span className="inline-block text-xs font-semibold text-blue-700 mt-3 group-hover:underline">Lire l’actualité →</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              {/* Sidebar */}
              <div className="space-y-5">
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-900 font-display">Informations</h3>
                  {[
                    { label: 'Domaine', value: project.domain },
                    { label: 'Région', value: project.region },
                    { label: 'Zone d’intervention', value: project.zone },
                    { label: 'Statut', value: project.status },
                    { label: 'Année', value: String(project.year) },
                    { label: 'Durée', value: project.duration },
                    { label: 'Public cible', value: project.target },
                    { label: 'Partenaires', value: project.partners.join(', ') },
                    { label: 'Bénéficiaires', value: project.beneficiaries.toLocaleString('fr-FR') + ' personnes' },
                  ].map(i => (
                    <div key={i.label} className="flex justify-between gap-3">
                      <span className="text-slate-500 text-xs">{i.label}</span>
                      <span className="text-slate-900 text-xs font-medium text-right">{i.value}</span>
                    </div>
                  ))}
                </div>
                <div className="p-5 rounded-xl border border-slate-200 space-y-3">
                  <h3 className="font-bold text-slate-900 font-display">Actions</h3>
                  <button onClick={() => navigate('donate', 'projet')} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">Soutenir ce projet</button>
                  <button onClick={() => navigate('partner')} className="w-full py-2.5 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">Devenir partenaire</button>
                  <button onClick={() => navigate('contact')} className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Nous contacter</button>
                </div>

                {allMedia.length > 0 && (
                  <div className="p-4 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-slate-900 font-display text-sm mb-3">Aperçu médias</h3>
                    <div className="grid grid-cols-3 gap-1.5">
                      {allMedia.slice(0, 3).map(m => (
                        <button
                          key={m.id}
                          onClick={() => { setMediaTab(m.type === 'video' ? 'videos' : 'photos'); setLightboxId(m.id); }}
                          className="relative rounded-lg overflow-hidden aspect-square bg-slate-100"
                          aria-label={m.title}
                        >
                          <img src={m.src} alt={m.title} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                          {m.type === 'video' && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center" aria-hidden="true">
                              <span className="text-white text-xs">▶</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 text-center">{allMedia.length} fichier{allMedia.length > 1 ? 's' : ''} · Voir ci-dessous</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  const filtered = projects.filter(p => {
    const matchDomain = !domainFilter || p.domain === domainFilter;
    const matchRegion = !regionFilter || p.region === regionFilter;
    const matchYear = !yearFilter || String(p.year) === yearFilter;
    const matchTarget = !targetFilter || p.target === targetFilter;
    const matchPartner = !partnerFilter || p.partners.includes(partnerFilter);
    const matchStatus = !statusFilter || p.status === statusFilter;
    const searchable = [p.title, p.description, p.domain, p.region, p.zone, p.target, ...p.partners].join(' ').toLowerCase();
    const matchSearch = !search || searchable.includes(search.toLowerCase());
    return matchDomain && matchRegion && matchYear && matchTarget && matchPartner && matchStatus && matchSearch;
  });

  const regions = Array.from(new Set(projects.map(p => p.region))).sort();
  const years = Array.from(new Set(projects.map(p => p.year))).sort((a, b) => b - a);
  const targets = Array.from(new Set(projects.map(p => p.target))).sort();
  const partners = Array.from(new Set(projects.flatMap(p => p.partners))).sort();
  const hasFilters = domainFilter || regionFilter || yearFilter || targetFilter || partnerFilter || statusFilter || search;
  const resetFilters = () => {
    setDomainFilter('');
    setRegionFilter('');
    setYearFilter('');
    setTargetFilter('');
    setPartnerFilter('');
    setStatusFilter('');
    setSearch('');
  };

  return (
    <>
      <PageHero
        title="Projets & Programmes"
        subtitle="Découvrez l'ensemble de nos projets et programmes en faveur de l'inclusion des personnes handicapées en Côte d'Ivoire."
        breadcrumbs={[{ label: 'Projets' }]}
      />
      <section className="py-10 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">Recherche multicritère</p>
              <h2 className="text-xl font-bold text-slate-900 font-display">Trouver un projet</h2>
            </div>
            {hasFilters && (
              <button onClick={resetFilters} className="self-start md:self-auto text-sm font-semibold text-blue-700 hover:underline">Réinitialiser les filtres</button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="search-projects" className="block text-xs font-semibold text-slate-700 mb-1.5">Mot-clé</label>
              <input
                id="search-projects"
                type="search"
                placeholder="Titre, zone, partenaire…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 text-sm bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            {[
              { label: 'Domaine', value: domainFilter, change: setDomainFilter, options: domains.map(d => d.title), empty: 'Tous les domaines' },
              { label: 'Région', value: regionFilter, change: setRegionFilter, options: regions, empty: 'Toutes les régions' },
              { label: 'Année', value: yearFilter, change: setYearFilter, options: years.map(String), empty: 'Toutes les années' },
              { label: 'Public cible', value: targetFilter, change: setTargetFilter, options: targets, empty: 'Tous les publics' },
              { label: 'Partenaire', value: partnerFilter, change: setPartnerFilter, options: partners, empty: 'Tous les partenaires' },
              { label: 'Statut', value: statusFilter, change: setStatusFilter, options: ['En cours', 'Terminé', 'Planifié'], empty: 'Tous les statuts' },
            ].map(filter => (
              <label key={filter.label} className="block text-xs font-semibold text-slate-700">
                {filter.label}
                <select value={filter.value} onChange={e => filter.change(e.target.value)} className="mt-1.5 w-full px-3 py-3 rounded-lg border border-slate-300 text-sm font-normal text-slate-700 bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none">
                  <option value="">{filter.empty}</option>
                  {filter.options.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            ))}
          </div>
          <p className="text-slate-600 text-sm mt-5" role="status">
            <span className="font-bold text-slate-900">{filtered.length}</span> projet{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
          </p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
              </svg>
              <p className="font-medium text-slate-600">Aucun projet ne correspond à votre recherche.</p>
              <button onClick={resetFilters} className="mt-4 text-sm font-semibold text-blue-700 hover:underline">Effacer les filtres</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate('project-detail', p.id)}
                  className="group text-left rounded-xl overflow-hidden border border-slate-200 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className="relative h-48 bg-slate-100 overflow-hidden">
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(p.status)}`}>{p.status}</span>
                    </div>
                    {p.media && p.media.length > 0 && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-black/60 text-white font-medium inline-flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10H3V8Zm13.5 5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                          </svg>
                          {p.media.length}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-blue-600 font-medium">{p.domain}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500">{p.region}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 font-display text-sm line-clamp-2 mb-2">{p.title}</h3>
                    <p className="text-slate-500 text-xs line-clamp-2 mb-4">{p.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold text-blue-600 font-display">{p.beneficiaries.toLocaleString('fr-FR')}</div>
                        <div className="text-slate-400 text-xs">bénéficiaires</div>
                      </div>
                      <span className="text-blue-600 text-xs font-medium group-hover:underline">Voir le projet →</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function ProjectsPage(props: Omit<Parameters<typeof ProjectsPageContent>[0], 'projects' | 'domains' | 'newsItems'>) {
  const q_projects = useProjects();
  const q_domains = useDomains();
  const q_newsItems = useNews();
  return (
    <QueryState queries={[q_projects, q_domains, q_newsItems]}>
      {() => <ProjectsPageContent {...props} projects={q_projects.data!} domains={q_domains.data!} newsItems={q_newsItems.data!} />}
    </QueryState>
  );
}

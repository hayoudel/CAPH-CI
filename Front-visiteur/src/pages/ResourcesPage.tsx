import { useState } from 'react';
import PageHero from '../components/PageHero';
import { useNavigation } from '../context/NavigationContext';
import QueryState from '../components/QueryState';
import { useResources } from '../hooks/queries';
import type { Resource } from '../types';

const categoryIcons: Record<string, string> = {
  'Rapports': '📊',
  'Guides pratiques': '📗',
  'Textes juridiques': '⚖️',
  'Études': '🔬',
  'Catalogues': '📋',
  'Supports de formation': '🎓',
  'Formulaires': '📝',
  'Publications': '📰',
};

type Props = { detail?: boolean };

function ResourcesPageContent({ detail, resources }: Props & { resources: Resource[] }) {
  const { navigate, selectedId } = useNavigation();
  const [catFilter, setCatFilter] = useState('');
  const [search, setSearch] = useState('');

  const resource = resources.find(r => r.id === selectedId);

  if (detail && resource) {
    return (
      <>
        <PageHero
          title={resource.title}
          subtitle={`${resource.category} · ${resource.author}`}
          breadcrumbs={[{ label: 'Ressources', page: 'resources' }, { label: resource.category }]}
          compact
        />
        <section className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2">
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">{resource.category}</span>
                  <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm">{resource.type}</span>
                </div>
                <p className="text-lg text-slate-700 leading-relaxed mb-6">{resource.description}</p>
                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                  {[
                    { label: 'Auteur', value: resource.author },
                    { label: 'Date', value: resource.date },
                    { label: 'Format', value: resource.type },
                    ...(resource.pages ? [{ label: 'Pages', value: `${resource.pages} pages` }] : []),
                    ...(resource.size ? [{ label: 'Taille', value: resource.size }] : []),
                  ].map(i => (
                    <div key={i.label} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-xs text-slate-500">{i.label}</div>
                      <div className="font-semibold text-slate-900 text-sm">{i.value}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-center gap-4">
                  <span className="text-3xl" aria-hidden="true">📄</span>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 font-display">{resource.title}</div>
                    <div className="text-slate-500 text-sm">{resource.type} {resource.size ? `· ${resource.size}` : ''}</div>
                  </div>
                  <button className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex-shrink-0">
                    Télécharger
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-5 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-900 font-display mb-3">Documents similaires</h3>
                  <div className="space-y-3">
                    {resources.filter(r => r.category === resource.category && r.id !== resource.id).slice(0, 3).map(r => (
                      <button key={r.id} onClick={() => navigate('resource-detail', r.id)} className="w-full text-left flex gap-2 hover:text-blue-600 transition-colors">
                        <span className="text-base" aria-hidden="true">{categoryIcons[r.category] ?? '📄'}</span>
                        <span className="text-xs text-slate-600 hover:text-blue-600 line-clamp-2">{r.title}</span>
                      </button>
                    ))}
                    {resources.filter(r => r.category === resource.category && r.id !== resource.id).length === 0 && (
                      <p className="text-slate-400 text-xs">Aucun document similaire.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  const categories = Array.from(new Set(resources.map(r => r.category)));

  const filtered = resources.filter(r => {
    const matchCat = !catFilter || r.category === catFilter;
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.author.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <>
      <PageHero
        title="Ressources"
        subtitle="Bibliothèque numérique de la CAPH-CI : publications, rapports, guides, textes juridiques et outils pratiques."
        breadcrumbs={[{ label: 'Ressources' }]}
      />

      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <aside className="lg:w-56 flex-shrink-0">
              <div className="sticky top-24">
                <h2 className="font-bold text-slate-900 font-display mb-4 text-sm">Catégories</h2>
                <div className="space-y-1">
                  <button
                    onClick={() => setCatFilter('')}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${!catFilter ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
                  >Toutes les ressources</button>
                  {categories.map(c => (
                    <button
                      key={c}
                      onClick={() => setCatFilter(c)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${catFilter === c ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <span aria-hidden="true">{categoryIcons[c] ?? '📄'}</span>
                      <span>{c}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="mb-6">
                <input
                  type="search"
                  placeholder="Rechercher une ressource..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <p className="text-slate-500 text-sm mb-6">{filtered.length} ressource{filtered.length > 1 ? 's' : ''}</p>

              {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <div className="text-5xl mb-4">📚</div>
                  <p>Aucune ressource ne correspond à votre recherche.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filtered.map(r => (
                    <button
                      key={r.id}
                      onClick={() => navigate('resource-detail', r.id)}
                      className="group w-full text-left p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex gap-4">
                        <div className="text-3xl flex-shrink-0" aria-hidden="true">{categoryIcons[r.category] ?? '📄'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{r.category}</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">{r.type}</span>
                            <span className="text-slate-400 text-xs">{r.date}</span>
                          </div>
                          <h3 className="font-bold text-slate-900 font-display text-sm mb-1">{r.title}</h3>
                          <p className="text-slate-500 text-xs leading-relaxed line-clamp-1">{r.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-slate-400 text-xs">{r.author}</span>
                            {r.pages && <span className="text-slate-400 text-xs">{r.pages} p.</span>}
                            {r.size && <span className="text-slate-400 text-xs">{r.size}</span>}
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex flex-col items-end justify-between">
                          <span className="text-blue-600 text-xs font-semibold group-hover:underline">Voir →</span>
                          <div className="mt-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-blue-100 hover:text-blue-600 transition-colors">
                            Télécharger
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function ResourcesPage(props: Omit<Parameters<typeof ResourcesPageContent>[0], 'resources'>) {
  const q_resources = useResources();
  return (
    <QueryState queries={[q_resources]}>
      {() => <ResourcesPageContent {...props} resources={q_resources.data!} />}
    </QueryState>
  );
}

import { useState } from 'react';
import PageHero from '../components/PageHero';
import { useNavigation } from '../context/NavigationContext';
import QueryState from '../components/QueryState';
import { useNews } from '../hooks/queries';
import type { NewsItem } from '../types';

const categories = ['Tous', 'Communiqués', 'Activités institutionnelles', 'Missions', 'Formations', 'Partenariats', 'Campagnes', 'Actions des délégations'];

type Props = { detail?: boolean };

function NewsPageContent({ detail, newsItems }: Props & { newsItems: NewsItem[] }) {
  const { navigate, selectedId } = useNavigation();
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [search, setSearch] = useState('');

  const article = newsItems.find(n => n.id === selectedId);

  if (detail && article) {
    return (
      <>
        <PageHero
          title={article.title}
          breadcrumbs={[{ label: 'Actualités', page: 'news' }, { label: article.category }]}
          compact
        />
        <section className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">{article.category}</span>
              <span className="text-slate-400 text-sm">{article.date}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-400 text-sm">{article.author}</span>
            </div>
            <div className="rounded-2xl overflow-hidden mb-8">
              <img src={article.image} alt={article.title} className="w-full h-72 object-cover" />
            </div>
            <div className="prose max-w-none">
              <p className="text-lg text-slate-700 leading-relaxed mb-6 font-medium">{article.summary}</p>
              <p className="text-slate-600 leading-relaxed mb-4">
                La CAPH-CI poursuit ses engagements en faveur de l'inclusion des personnes handicapées en Côte d'Ivoire. Cette initiative s'inscrit dans le cadre du Plan stratégique 2025-2030 et vise à renforcer la présence et l'impact de l'organisation à l'échelle nationale.
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                Les parties prenantes impliquées ont salué la qualité du travail accompli et se sont engagées à poursuivre la collaboration dans les mois à venir. Des résultats concrets sont attendus d'ici la fin de l'exercice 2026.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Pour plus d'informations, n'hésitez pas à contacter le service communication de la CAPH-CI à l'adresse <a href="mailto:caphci2011@gmail.com" className="text-blue-600 hover:underline">caphci2011@gmail.com</a> ou par téléphone au 07 08 24 95 30.
              </p>
            </div>
            <div className="mt-10 pt-8 border-t border-slate-200">
              <h3 className="font-bold text-slate-900 font-display mb-4">Partager cet article</h3>
              <div className="flex gap-3">
                {['Facebook', 'Twitter', 'LinkedIn', 'WhatsApp'].map(s => (
                  <button key={s} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">{s}</button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Related articles */}
        <section className="py-10 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-xl font-bold text-slate-900 font-display mb-6">Articles récents</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {newsItems.filter(n => n.id !== article.id).slice(0, 4).map(n => (
                <button key={n.id} onClick={() => navigate('news-detail', n.id)} className="group text-left flex gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-200 transition-colors">
                  <img src={n.image} alt={n.title} className="w-16 h-14 object-cover rounded-lg flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-blue-600 font-medium mb-1">{n.category}</div>
                    <div className="font-semibold text-slate-900 text-xs font-display line-clamp-2">{n.title}</div>
                    <div className="text-slate-400 text-xs mt-1">{n.date}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </>
    );
  }

  const filtered = newsItems.filter(n => {
    const matchCat = activeCategory === 'Tous' || n.category === activeCategory;
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <>
      <PageHero
        title="Actualités & Événements"
        subtitle="Suivez toutes les actualités, événements et publications de la CAPH-CI et de ses délégations."
        breadcrumbs={[{ label: 'Actualités' }]}
      />

      {/* Filters */}
      <div className="py-6 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 min-w-0">
              <input
                type="search"
                placeholder="Rechercher une actualité..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1" role="tablist">
            {categories.map(cat => (
              <button
                key={cat}
                role="tab"
                aria-selected={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >{cat}</button>
            ))}
          </div>
        </div>
      </div>

      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          {/* Featured article */}
          {filtered.length > 0 && activeCategory === 'Tous' && !search && (
            <button
              onClick={() => navigate('news-detail', filtered[0].id)}
              className="group w-full text-left rounded-2xl overflow-hidden border border-slate-200 hover:shadow-lg transition-all mb-8"
            >
              <div className="grid lg:grid-cols-2">
                <div className="h-64 lg:h-auto bg-slate-100 overflow-hidden">
                  <img src={filtered[0].image} alt={filtered[0].title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">{filtered[0].category}</span>
                    <span className="text-xs text-slate-400">{filtered[0].date}</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 font-display mb-3">{filtered[0].title}</h2>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">{filtered[0].summary}</p>
                  <span className="text-blue-600 text-sm font-semibold group-hover:underline">Lire l'article →</span>
                </div>
              </div>
            </button>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activeCategory !== 'Tous' || search ? filtered : filtered.slice(1)).map(n => (
              <button
                key={n.id}
                onClick={() => navigate('news-detail', n.id)}
                className="group text-left rounded-xl overflow-hidden border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="h-44 bg-slate-100 overflow-hidden">
                  <img src={n.image} alt={n.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs font-medium">{n.category}</span>
                    <span className="text-xs text-slate-400">{n.date}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 font-display text-sm line-clamp-2 mb-2">{n.title}</h3>
                  <p className="text-slate-500 text-xs line-clamp-2 mb-3">{n.summary}</p>
                  <span className="text-blue-600 text-xs font-medium group-hover:underline">Lire →</span>
                </div>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <div className="text-5xl mb-4">📰</div>
              <p>Aucun article ne correspond à votre recherche.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function NewsPage(props: Omit<Parameters<typeof NewsPageContent>[0], 'newsItems'>) {
  const q_newsItems = useNews();
  return (
    <QueryState queries={[q_newsItems]}>
      {() => <NewsPageContent {...props} newsItems={q_newsItems.data!} />}
    </QueryState>
  );
}

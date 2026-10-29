import { useState } from 'react';
import PageHero from '../components/PageHero';

export default function DelegationsPage(_props: { detail?: boolean }) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'map' | 'list'>('map');

  return (
    <>
      <PageHero
        title="Nos délégations"
        subtitle="Un réseau de 45 délégations régionales et communales au plus près des personnes handicapées."
        breadcrumbs={[{ label: 'Délégations' }]}
      />

      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 mb-8" role="note">
            <div className="flex gap-3">
              <svg className="w-6 h-6 text-orange-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10 3h4l7 18H3L10 3Z" />
              </svg>
              <div>
                <h2 className="font-bold text-slate-900 font-display">Annuaire territorial en cours de validation</h2>
                <p className="text-sm text-slate-600 mt-1">Les noms, responsables, communes, coordonnées et données géographiques seront publiés après validation officielle par la CAPH-CI. Aucun contact provisoire n’est affiché.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 md:items-end justify-between mb-8">
            <div className="flex-1 max-w-2xl">
              <label htmlFor="delegation-search" className="block text-sm font-bold text-slate-700 mb-1.5">Rechercher par nom, région ou commune</label>
              <input id="delegation-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher une délégation…" className="w-full min-h-11 rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none" />
            </div>
            <div className="inline-flex rounded-lg border border-slate-300 p-1" role="group" aria-label="Mode d’affichage">
              <button onClick={() => setView('map')} aria-pressed={view === 'map'} className={`min-h-11 rounded-md px-4 py-2 text-sm font-bold ${view === 'map' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>Carte</button>
              <button onClick={() => setView('list')} aria-pressed={view === 'list'} className={`min-h-11 rounded-md px-4 py-2 text-sm font-bold ${view === 'list' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>Liste</button>
            </div>
          </div>

          {view === 'map' ? (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 min-h-[460px] rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center p-8">
                <div className="max-w-md text-center">
                  <svg className="w-16 h-16 mx-auto text-blue-700 mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Zm0 0V3m6 18V6" />
                  </svg>
                  <h2 className="text-xl font-bold text-slate-900 font-display">Carte interactive à compléter</h2>
                  <p className="text-sm text-slate-600 mt-3 leading-relaxed">Les repères seront ajoutés uniquement lorsque les coordonnées géographiques des délégations auront été confirmées.</p>
                </div>
              </div>
              <aside className="rounded-2xl bg-[#004D29] text-white p-7">
                <div className="text-5xl font-extrabold font-display text-[#FFD600]">45</div>
                <h2 className="text-xl font-bold font-display mt-2">délégations régionales et communales</h2>
                <p className="text-green-100 text-sm leading-relaxed mt-4">Un réseau de proximité destiné à écouter les besoins et agir au plus près des populations.</p>
              </aside>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center" role="status">
              <h2 className="text-xl font-bold text-slate-900 font-display">Aucune fiche publique validée</h2>
              <p className="text-sm text-slate-600 mt-3 max-w-xl mx-auto">La liste filtrable et les fiches détaillées apparaîtront ici dès que l’annuaire officiel aura été validé. Recherche saisie : {search || 'aucune'}.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

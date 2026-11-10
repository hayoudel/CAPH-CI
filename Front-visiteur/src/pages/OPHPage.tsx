import { useState } from 'react';
import PageHero from '../components/PageHero';
import { useNavigation } from '../context/NavigationContext';
import QueryState from '../components/QueryState';
import { useOrganizations } from '../hooks/queries';
import type { OPH } from '../types';

type Props = { detail?: boolean };

function OPHPageContent({ detail, ophList }: Props & { ophList: OPH[] }) {
  const { navigate, selectedId } = useNavigation();
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');

  const oph = ophList.find(o => o.id === selectedId);

  if (detail && oph) {
    return (
      <>
        <PageHero
          title={oph.name}
          subtitle={`${oph.type} · ${oph.region}`}
          breadcrumbs={[{ label: 'Annuaire des OPH', page: 'oph' }, { label: oph.name }]}
          compact
        />
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-8">
                <div className="flex gap-5 items-start">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                    <img src={oph.image} alt={oph.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 font-display">{oph.name}</h2>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{oph.type}</span>
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">{oph.region}</span>
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">Fondée en {oph.founded}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display mb-3">À propos</h3>
                  <p className="text-slate-600 leading-relaxed">{oph.description}</p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display mb-3">Domaines d'intervention</h3>
                  <div className="flex flex-wrap gap-2">
                    {oph.domain.split(', ').map(d => (
                      <span key={d} className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">{d}</span>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Membres', value: oph.members.toLocaleString('fr-FR'), icon: '👥' },
                    { label: 'Fondée en', value: oph.founded, icon: '📅' },
                    { label: 'Région', value: oph.region, icon: '📍' },
                  ].map(s => (
                    <div key={s.label} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <div className="text-2xl mb-2" aria-hidden="true">{s.icon}</div>
                      <div className="text-2xl font-bold text-blue-600 font-display">{s.value}</div>
                      <div className="text-slate-500 text-xs">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-blue-600 text-white">
                  <h3 className="font-bold font-display mb-3">Contact</h3>
                  <a href={`mailto:${oph.contact}`} className="text-blue-100 hover:text-white text-sm break-all">{oph.contact}</a>
                </div>
                <div className="p-5 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-900 font-display mb-3">Membre de la CAPH-CI</h3>
                  <p className="text-slate-500 text-xs mb-3">Cette organisation est membre officielle de la CAPH-CI.</p>
                  <button onClick={() => navigate('oph')} className="text-blue-600 text-xs hover:underline">← Retour à l'annuaire</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  const regions = Array.from(new Set(ophList.map(o => o.region)));
  const types = Array.from(new Set(ophList.map(o => o.type)));

  const filtered = ophList.filter(o => {
    const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.description.toLowerCase().includes(search.toLowerCase());
    const matchRegion = !regionFilter || o.region === regionFilter;
    const matchType = !typeFilter || o.type === typeFilter;
    const matchDomain = !domainFilter || o.domain.toLowerCase().includes(domainFilter.toLowerCase());
    return matchSearch && matchRegion && matchType && matchDomain;
  });

  return (
    <>
      <PageHero
        title="Annuaire des OPH"
        subtitle="Trouvez une organisation de personnes handicapées parmi les 37 organisations affiliées de la CAPH-CI."
        breadcrumbs={[{ label: 'Annuaire des OPH' }]}
      />

      {/* Search & Filters */}
      <div className="py-6 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-52">
              <input
                type="search"
                placeholder="Rechercher par nom, description..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 outline-none bg-white"
              />
            </div>
            <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:border-blue-500 outline-none">
              <option value="">Toutes les régions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:border-blue-500 outline-none">
              <option value="">Type de handicap</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {(search || regionFilter || typeFilter) && (
              <button onClick={() => { setSearch(''); setRegionFilter(''); setTypeFilter(''); setDomainFilter(''); }} className="px-3 py-2.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-white">Réinitialiser</button>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-3">{filtered.length} organisation{filtered.length > 1 ? 's' : ''} trouvée{filtered.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(o => (
              <button
                key={o.id}
                onClick={() => navigate('oph-detail', o.id)}
                className="group text-left p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                    <img src={o.image} alt={o.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 font-display text-sm line-clamp-2">{o.name}</h3>
                    <div className="text-xs text-blue-600 font-medium mt-1">{o.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">📍 {o.region}</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs">{o.members} membres</span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-3">{o.description}</p>
                <span className="text-blue-600 text-xs font-semibold group-hover:underline">Voir le profil →</span>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <div className="text-5xl mb-4">🏢</div>
              <p>Aucune organisation ne correspond à votre recherche.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA for OPH */}
      <section className="py-12 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold font-display mb-3">Votre organisation n'est pas dans l'annuaire ?</h2>
          <p className="text-blue-100 mb-6">Rejoignez le réseau de la CAPH-CI et faites partie des 37 organisations affiliées qui agissent pour l'inclusion des personnes handicapées en Côte d'Ivoire.</p>
          <button onClick={() => navigate('partner')} className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">Adhérer à la CAPH-CI</button>
        </div>
      </section>
    </>
  );
}

export default function OPHPage(props: Omit<Parameters<typeof OPHPageContent>[0], 'ophList'>) {
  const q_ophList = useOrganizations();
  return (
    <QueryState queries={[q_ophList]}>
      {() => <OPHPageContent {...props} ophList={q_ophList.data!} />}
    </QueryState>
  );
}

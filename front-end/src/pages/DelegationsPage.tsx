import { useMemo, useState, type KeyboardEvent } from 'react';
import PageHero from '../components/PageHero';
import QueryState from '../components/QueryState';
import ProvisionalBadge from '../components/ProvisionalBadge';
import { useDelegations } from '../hooks/queries';
import { useNavigation } from '../context/NavigationContext';
import { ciMap, projectPoint } from '../lib/ciMap';
import type { Delegation } from '../types';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const regionName = (id: string) => ciMap.regions.find(r => r.id === id)?.name ?? id;

/** Active un élément SVG « bouton » avec Entrée ou Espace. */
const onActivate = (action: () => void) => (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
};

function DelegationsPageContent({ delegations, initialId }: { delegations: Delegation[]; initialId: string | null }) {
  const initial = delegations.find(d => d.id === initialId) ?? null;
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'map' | 'list'>('map');
  const [zoneId, setZoneId] = useState<string | null>(initial?.zoneId ?? null);
  const [delegationId, setDelegationId] = useState<string | null>(initial?.id ?? null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(search);
    if (!q) return delegations;
    return delegations.filter(d => normalize(`${d.name} ${d.chefLieu} ${d.district} ${regionName(d.zoneId)}`).includes(q));
  }, [delegations, search]);

  const matchesByZone = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(d => map.set(d.zoneId, (map.get(d.zoneId) ?? 0) + 1));
    return map;
  }, [filtered]);

  const zoneDelegations = zoneId ? delegations.filter(d => d.zoneId === zoneId) : [];
  const selectedDelegation = delegations.find(d => d.id === delegationId) ?? null;

  const selectZone = (id: string) => { setZoneId(id); setDelegationId(null); };
  const selectDelegation = (d: Delegation) => { setZoneId(d.zoneId); setDelegationId(d.id); };
  const clearSelection = () => { setZoneId(null); setDelegationId(null); };

  const [width, height] = ciMap.viewBox;
  const labelled = delegations.find(d => d.id === (hoverId ?? delegationId)) ?? null;
  const ordered = [...filtered].sort((a, b) => (a.id === delegationId ? 1 : 0) - (b.id === delegationId ? 1 : 0));

  return (
    <>
      <PageHero
        title="Nos délégations"
        subtitle="Un réseau de 45 délégations régionales et communales au plus près des personnes handicapées."
        breadcrumbs={[{ label: 'Délégations' }]}
      />

      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
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

          <p className="sr-only" role="status" aria-live="polite">{filtered.length} repère{filtered.length > 1 ? 's' : ''} correspondant{filtered.length > 1 ? 's' : ''}.</p>

          {view === 'map' ? (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Carte */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  role="group"
                  aria-label="Carte de la Côte d’Ivoire. Chaque région et chaque repère est un bouton."
                  className="w-full h-auto max-h-[640px] mx-auto"
                >
                  {ciMap.regions.map(region => {
                    const count = matchesByZone.get(region.id) ?? 0;
                    const selected = region.id === zoneId;
                    const fill = selected
                      ? 'fill-[#006B35]'
                      : count > 0
                        ? 'fill-[#CFE8D9] hover:fill-[#A9D4BC]'
                        : 'fill-[#E9EDEB] hover:fill-[#D5DBD8]';
                    return (
                      <path
                        key={region.id}
                        d={region.path}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected}
                        aria-label={`Région ${region.name} : ${count} repère${count > 1 ? 's' : ''} provisoire${count > 1 ? 's' : ''}`}
                        onClick={() => selectZone(region.id)}
                        onKeyDown={onActivate(() => selectZone(region.id))}
                        className={`map-zone stroke-white transition-colors ${fill}`}
                        strokeWidth={1.5}
                        strokeLinejoin="round"
                      />
                    );
                  })}

                  {ordered.map(d => {
                    const { x, y } = projectPoint(d.lat, d.lng);
                    const selected = d.id === delegationId;
                    return (
                      <g
                        key={d.id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected}
                        aria-label={`${d.chefLieu} : ${d.name} (repère provisoire)`}
                        className="map-point"
                        onClick={() => selectDelegation(d)}
                        onKeyDown={onActivate(() => selectDelegation(d))}
                        onMouseEnter={() => setHoverId(d.id)}
                        onMouseLeave={() => setHoverId(null)}
                        onFocus={() => setHoverId(d.id)}
                        onBlur={() => setHoverId(null)}
                      >
                        <circle cx={x} cy={y} r={16} fill="transparent" />
                        {selected && <circle cx={x} cy={y} r={11} fill="none" stroke="#1A1A1A" strokeWidth={2.5} />}
                        <circle cx={x} cy={y} r={6.5} fill="#F56600" stroke="#fff" strokeWidth={2} />
                      </g>
                    );
                  })}

                  {labelled && (() => {
                    const { x, y } = projectPoint(labelled.lat, labelled.lng);
                    return (
                      <text x={x} y={y - 16} textAnchor="middle" fontSize={15} fontWeight={700} fill="#1A1A1A" stroke="#fff" strokeWidth={4} paintOrder="stroke" pointerEvents="none" aria-hidden="true">
                        {labelled.chefLieu}
                      </text>
                    );
                  })()}
                </svg>

                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-[#F56600] border-2 border-white ring-1 ring-slate-400" aria-hidden="true" />Délégation (repère provisoire)</span>
                  <span className="inline-flex items-center gap-2"><span className="inline-block w-4 h-3 rounded-sm bg-[#CFE8D9]" aria-hidden="true" />Région avec repère</span>
                  <span className="inline-flex items-center gap-2"><span className="inline-block w-4 h-3 rounded-sm bg-[#006B35]" aria-hidden="true" />Région sélectionnée</span>
                </div>
              
              </div> 

              {/* Informations sur la zone */}
              <aside className="space-y-5" aria-label="Informations sur la zone sélectionnée">
                <div className="rounded-2xl border border-slate-200 bg-white p-6" aria-live="polite">
                  {zoneId ? (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Région</p>
                          <h2 className="text-xl font-bold text-slate-900 font-display">{regionName(zoneId)}</h2>
                        </div>
                        <button onClick={clearSelection} className="min-h-11 px-3 text-sm font-bold text-blue-700 hover:underline">Effacer</button>
                      </div>

                      {zoneDelegations.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-600 leading-relaxed">Aucune délégation provisoire n’est rattachée à cette région. L’information sera confirmée après validation de l’annuaire officiel.</p>
                      ) : (
                        <ul className="mt-4 space-y-2">
                          {zoneDelegations.map(d => (
                            <li key={d.id}>
                              <button
                                onClick={() => selectDelegation(d)}
                                aria-pressed={d.id === delegationId}
                                className={`w-full text-left rounded-xl border p-3 transition-colors ${d.id === delegationId ? 'border-[#006B35] bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}
                              >
                                <span className="block font-bold text-slate-900 text-sm font-display">{d.name}</span>
                                <span className="block text-xs text-slate-600 mt-0.5">Chef-lieu : {d.chefLieu}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {selectedDelegation && (
                        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm border-t border-slate-200 pt-4">
                          <dt className="font-bold text-slate-700">Niveau</dt><dd className="text-slate-600">Délégation {selectedDelegation.level}</dd>
                          <dt className="font-bold text-slate-700">Chef-lieu</dt><dd className="text-slate-600">{selectedDelegation.chefLieu}</dd>
                          <dt className="font-bold text-slate-700">District</dt><dd className="text-slate-600">{selectedDelegation.district}</dd>
                          <dt className="font-bold text-slate-700">Contact</dt><dd className="text-slate-600">À valider par la CAPH-CI</dd>
                        </dl>
                      )}
                      <div className="mt-4"><ProvisionalBadge item={selectedDelegation ?? zoneDelegations[0]} /></div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-lg font-bold text-slate-900 font-display">Explorer la carte</h2>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">Sélectionnez une région ou un repère orange pour afficher les informations de la zone. Au clavier, utilisez Tab puis Entrée.</p>
                    </>
                  )}
                </div>

                <div className="rounded-2xl bg-[#004D29] text-white p-7">
                  <div className="text-5xl font-extrabold font-display text-[#FFD600]">45</div>
                  <h2 className="text-xl font-bold font-display mt-2">délégations régionales et communales</h2>
                  <p className="text-green-100 text-sm leading-relaxed mt-4">Un réseau de proximité destiné à écouter les besoins et agir au plus près des populations.</p>
                </div>
              </aside>
            </div>
          ) : filtered.length > 0 ? (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(d => (
                <li key={d.id} className="rounded-2xl border border-slate-200 p-5">
                  <h2 className="font-bold text-slate-900 font-display">{d.name}</h2>
                  <p className="text-sm text-slate-600 mt-1">{d.chefLieu} · {regionName(d.zoneId)}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <ProvisionalBadge item={d} />
                    <button onClick={() => { selectDelegation(d); setView('map'); }} className="min-h-11 text-sm font-bold text-blue-700 hover:underline">Voir sur la carte</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center" role="status">
              <h2 className="text-xl font-bold text-slate-900 font-display">Aucune fiche publique validée</h2>
              <p className="text-sm text-slate-600 mt-3 max-w-xl mx-auto">Aucune délégation ne correspond à la recherche. Recherche saisie : {search || 'aucune'}.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function DelegationsPage(_props: { detail?: boolean }) {
  const { selectedId } = useNavigation();
  const query = useDelegations();
  return (
    <QueryState queries={query}>
      {() => <DelegationsPageContent delegations={query.data!} initialId={selectedId} />}
    </QueryState>
  );
}

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { pagePath } from '../routes/paths';
import PageHero from '../components/PageHero';
import QueryState from '../components/QueryState';
import { useAgenda } from '../hooks/queries';
import type { AgendaEvent } from '../types';

const typeColors: Record<string, string> = {
  'Réunion institutionnelle': 'bg-blue-100 text-blue-700',
  'Journée nationale': 'bg-green-100 text-green-700',
  'Formation': 'bg-orange-100 text-orange-800',
  'Assemblée générale': 'bg-amber-100 text-amber-700',
  'Forum': 'bg-orange-100 text-orange-700',
  'Journée internationale': 'bg-green-100 text-green-700',
};

const typeBarColor: Record<string, string> = {
  'Réunion institutionnelle': 'bg-blue-500',
  'Journée nationale': 'bg-green-500',
  'Formation': 'bg-orange-500',
  'Assemblée générale': 'bg-amber-500',
  'Forum': 'bg-orange-500',
  'Journée internationale': 'bg-green-500',
};

function AgendaPageContent({ agendaEvents }: { agendaEvents: AgendaEvent[] }) {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [typeFilter, setTypeFilter] = useState('');
  const { eventId } = useParams();
  const routerNavigate = useNavigate();
  const selectedEventId = eventId ?? null;
  const setSelectedEventId = (id: string | null) => routerNavigate(id ? pagePath('agenda-detail', id) : pagePath('agenda'));

  const types = Array.from(new Set(agendaEvents.map(e => e.type)));
  const filtered = typeFilter ? agendaEvents.filter(e => e.type === typeFilter) : agendaEvents;
  const selectedEvent = agendaEvents.find(e => e.id === selectedEventId);

  // Event detail view
  if (selectedEventId && selectedEvent) {
    return (
      <>
        <PageHero
          title={selectedEvent.title}
          subtitle={`${selectedEvent.type} · ${selectedEvent.location}`}
          breadcrumbs={[
            { label: 'Actualités', page: 'news' },
            { label: 'Agenda', page: 'agenda' },
            { label: selectedEvent.title },
          ]}
          compact
        />
        <section className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <button
              onClick={() => setSelectedEventId(null)}
              className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:underline mb-8"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour à l'agenda
            </button>

            <div className="grid lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2">
                {/* Image */}
                <div className="rounded-2xl overflow-hidden mb-8">
                  <img src={selectedEvent.image} alt={selectedEvent.title} className="w-full h-64 object-cover" />
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${typeColors[selectedEvent.type] ?? 'bg-slate-100 text-slate-700'}`}>{selectedEvent.type}</span>
                  <span className="px-3 py-1.5 rounded-full text-sm bg-slate-100 text-slate-600">{selectedEvent.location}</span>
                </div>

                <p className="text-slate-600 leading-relaxed mb-8">{selectedEvent.description}</p>

                {/* Objectives */}
                {selectedEvent.objectives && selectedEvent.objectives.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-slate-900 font-display mb-4">Objectifs</h2>
                    <ul className="space-y-2">
                      {selectedEvent.objectives.map((obj, i) => (
                        <li key={i} className="flex gap-3 text-slate-600 text-sm">
                          <span className="text-blue-600 font-bold flex-shrink-0">{i + 1}.</span>
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Organizers */}
                {selectedEvent.organizers && selectedEvent.organizers.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-slate-900 font-display mb-4">Organisateurs</h2>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.organizers.map((org, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-full text-sm bg-blue-50 border border-blue-200 text-blue-700 font-medium">{org}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Practical info */}
                {selectedEvent.practicalInfo && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8">
                    <h2 className="text-lg font-bold text-slate-900 font-display mb-3">Informations pratiques</h2>
                    <p className="text-slate-600 text-sm leading-relaxed">{selectedEvent.practicalInfo}</p>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-900 font-display">Détails</h3>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Date</div>
                    <div className="font-semibold text-slate-900 text-sm">{selectedEvent.date}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Heure</div>
                    <div className="font-semibold text-slate-900 text-sm">{selectedEvent.time}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Lieu</div>
                    <div className="font-semibold text-slate-900 text-sm">{selectedEvent.location}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Type</div>
                    <div className="font-semibold text-slate-900 text-sm">{selectedEvent.type}</div>
                  </div>
                </div>

                {selectedEvent.contact && (
                  <div className="p-5 rounded-xl bg-blue-50 border border-blue-200">
                    <h3 className="font-bold text-slate-900 font-display text-sm mb-3">Contact</h3>
                    <a href={`mailto:${selectedEvent.contact}`} className="text-blue-600 text-sm font-medium hover:underline break-all">
                      {selectedEvent.contact}
                    </a>
                  </div>
                )}

                <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm">
                  S'inscrire à cet événement
                </button>
                <button className="w-full py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm">
                  Ajouter à mon calendrier
                </button>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero
        title="Agenda"
        subtitle="Retrouvez tous les événements, réunions, formations et journées nationales de la CAPH-CI."
        breadcrumbs={[{ label: 'Actualités', page: 'news' }, { label: 'Agenda' }]}
        compact
      />

      {/* View toggle + filters */}
      <div className="py-4 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-4 flex-wrap">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button onClick={() => setView('list')} className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <span aria-hidden="true" className="mr-1.5">☰</span>Liste
            </button>
            <button onClick={() => setView('calendar')} className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <span aria-hidden="true" className="mr-1.5">📅</span>Calendrier
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button onClick={() => setTypeFilter('')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${!typeFilter ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Tous</button>
            {types.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${typeFilter === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          {view === 'list' && (
            <div className="space-y-5">
              {filtered.map(event => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  className="group w-full text-left rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="flex gap-0">
                    {/* Image */}
                    <div className="relative flex-shrink-0 w-32 sm:w-48 bg-slate-100 overflow-hidden">
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5" aria-hidden="true" />
                    </div>

                    <div className="flex-1 p-5 min-w-0">
                      {/* Date pill */}
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" aria-hidden="true" />
                          <span className="text-xs font-semibold text-blue-600">{event.date}</span>
                        </div>
                        {event.time && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <span aria-hidden="true">🕐</span>{event.time}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <span aria-hidden="true">📍</span>{event.location}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[event.type] ?? 'bg-slate-100 text-slate-600'}`}>{event.type}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 font-display mb-1.5 line-clamp-2">{event.title}</h3>
                      <p className="text-slate-500 text-sm line-clamp-2">{event.description}</p>
                      <div className="mt-3 flex items-center gap-1 text-blue-600 text-xs font-medium group-hover:underline">
                        Voir les détails
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {view === 'calendar' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 font-display">Octobre – Décembre 2026</h2>
              </div>
              {/* Calendar grid */}
              <div className="rounded-xl border border-slate-200 overflow-hidden mb-8">
                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                    <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {/* October 2026: starts on Thursday */}
                  {[...Array(3)].map((_, i) => <div key={`empty-${i}`} className="h-14 border-r border-b border-slate-100" />)}
                  {[...Array(31)].map((_, i) => {
                    const day = i + 1;
                    const dayEvent = filtered.find(e => e.date.includes(String(day)));
                    return (
                      <button
                        key={day}
                        onClick={() => dayEvent && setSelectedEventId(dayEvent.id)}
                        className={`h-14 border-r border-b border-slate-100 p-1.5 text-left transition-colors ${dayEvent ? 'bg-blue-50 hover:bg-blue-100 cursor-pointer' : 'cursor-default'}`}
                        disabled={!dayEvent}
                      >
                        <div className={`text-xs font-medium ${dayEvent ? 'text-blue-700 font-bold' : 'text-slate-500'}`}>{day}</div>
                        {dayEvent && (
                          <div className={`mt-0.5 text-xs px-1 rounded ${typeColors[dayEvent.type] ?? 'bg-slate-100 text-slate-600'} leading-tight line-clamp-1 hidden sm:block`}>
                            {dayEvent.title.split(' ').slice(0, 2).join(' ')}…
                          </div>
                        )}
                        {dayEvent && (
                          <div className="w-2 h-2 rounded-full bg-blue-600 mt-0.5 sm:hidden" aria-label="Événement" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 font-display mb-4">Tous les événements</h3>
                {filtered.map(event => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEventId(event.id)}
                    className="group w-full flex gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all text-left"
                  >
                    <div className={`w-1 rounded-full flex-shrink-0 ${typeBarColor[event.type] ?? 'bg-slate-400'}`} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm font-display group-hover:text-blue-600 transition-colors">{event.title}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{event.date} · {event.time} · {event.location}</div>
                    </div>
                    <span className={`self-start px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${typeColors[event.type] ?? 'bg-slate-100 text-slate-600'}`}>{event.type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <div className="text-5xl mb-4">📅</div>
              <p>Aucun événement dans cette catégorie.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function AgendaPage(props: Omit<Parameters<typeof AgendaPageContent>[0], 'agendaEvents'>) {
  const q_agendaEvents = useAgenda();
  return (
    <QueryState queries={[q_agendaEvents]}>
      {() => <AgendaPageContent {...props} agendaEvents={q_agendaEvents.data!} />}
    </QueryState>
  );
}

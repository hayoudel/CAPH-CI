import { useState } from 'react';
import PageHero from '../components/PageHero';
import { useNavigation } from '../context/NavigationContext';

type Tab = 'about' | 'mission' | 'gouvernance';

const leadership = [
  { name: 'M. KONE Yacouba', role: 'Président du Conseil d’administration et représentant légal' },
  { name: 'Mme KONAN N’DRI Sophie', role: 'Directrice exécutive' },
];

const values = [
  { icon: '🌍', title: 'Inclusion', description: 'Nous travaillons pour une société qui intègre pleinement et activement les personnes handicapées.' },
  { icon: '⚖️', title: 'Dignité humaine', description: 'Nous reconnaissons et respectons la dignité inhérente de chaque personne handicapée, sans exception.' },
  { icon: '⚖️', title: 'Justice sociale', description: 'Nous défendons l’égalité des droits, des chances et de traitement.' },
  { icon: '🤝', title: 'Solidarité', description: 'Nous cultivons l’entraide, la coopération et le soutien mutuel entre toutes les organisations membres.' },
  { icon: '🔍', title: 'Redevabilité', description: 'Nous rendons compte de nos décisions, de nos actions et de l’utilisation de nos ressources.' },
];

const timeline = [
  { year: 'Juin 2011', event: 'Création de la Coordination des Associations de Personnes Handicapées de Côte d’Ivoire.' },
  { year: 'Aujourd’hui', event: 'Plus de 50 000 membres, 37 organisations affiliées et 45 délégations régionales et communales.' },
];

type Props = {
  initialTab?: Tab;
};

export default function AboutPage({ initialTab = 'about' }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const { navigate } = useNavigation();

  const tabs: { key: Tab; label: string }[] = [
    { key: 'about', label: 'La CAPH-CI' },
    { key: 'mission', label: 'Mission / Vision / Valeurs' },
    { key: 'gouvernance', label: 'Gouvernance' },
  ];

  return (
    <>
      <PageHero
        title="La CAPH-CI"
        subtitle="Coordination des Associations de Personnes Handicapées de Côte d'Ivoire"
        breadcrumbs={[{ label: 'La CAPH-CI' }]}
      />

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto" role="tablist">
            {tabs.map(t => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* About tab */}
      {tab === 'about' && (
        <div>
          {/* Intro */}
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 font-display mb-6">Une organisation nationale engagée depuis juin 2011</h2>
                  <p className="text-slate-600 leading-relaxed mb-4">La Coordination des Associations de Personnes Handicapées de Côte d'Ivoire est une organisation nationale de la société civile, laïque, apolitique et à but non lucratif.</p>
                  <p className="text-slate-600 leading-relaxed mb-4">Sa mission est de représenter et défendre les personnes handicapées, promouvoir leurs droits et contribuer à l’amélioration durable de leurs conditions de vie.</p>
                  <p className="text-slate-600 leading-relaxed mb-8">La CAPH-CI rassemble plus de 50 000 membres, 37 organisations affiliées et 45 délégations régionales et communales. Ses projets, campagnes et actions communautaires ont touché plus de 3 millions de personnes.</p>
                  <div className="flex gap-3 flex-wrap">
                    <button onClick={() => navigate('actions')} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm">Voir nos actions</button>
                    <button onClick={() => navigate('projects')} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:border-blue-600 hover:text-blue-600 transition-colors text-sm">Nos projets</button>
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&h=600&fit=crop&auto=format"
                    alt="Membres de la CAPH-CI en réunion"
                    className="w-full h-80 object-cover"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section className="py-16 bg-slate-50">
            <div className="max-w-4xl mx-auto px-4">
              <h2 className="text-2xl font-bold text-slate-900 font-display mb-10 text-center">Notre parcours</h2>
              <div className="relative">
                <div className="absolute left-16 top-0 bottom-0 w-px bg-slate-200" aria-hidden="true" />
                <div className="space-y-6">
                  {timeline.map(item => (
                    <div key={item.year} className="flex gap-6 items-start">
                      <div className="w-16 flex-shrink-0 text-right">
                        <span className="font-bold text-blue-600 font-display text-sm">{item.year}</span>
                      </div>
                      <div className="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0 mt-0.5 relative z-10" aria-hidden="true" />
                      <p className="text-slate-600 text-sm leading-relaxed pt-0">{item.event}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          <section className="py-16 bg-white" aria-labelledby="specialized-title">
            <div className="max-w-7xl mx-auto px-4">
              <div className="max-w-2xl mb-8">
                <h2 id="specialized-title" className="text-2xl font-bold text-slate-900 font-display mb-3">Structures spécialisées</h2>
                <p className="text-slate-600">Deux structures complètent l’action institutionnelle de la CAPH-CI.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-slate-200 p-7">
                  <h3 className="text-xl font-bold text-slate-900 font-display mb-3">Maison d’Espoir des Personnes Handicapées</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Présentation détaillée à intégrer après validation des informations institutionnelles destinées à la publication.</p>
                  <span className="inline-flex mt-5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">Contenu à valider</span>
                </div>
                <div className="rounded-2xl border border-slate-200 p-7">
                  <h3 className="text-xl font-bold text-slate-900 font-display mb-3">Cabinet de Conseil en Solutions Handicap</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Une structure dédiée à l’accompagnement des organisations sur les enjeux d’accessibilité, d’emploi inclusif, de formation, d’études et d’audits.</p>
                  <button onClick={() => navigate('cabinet')} className="mt-5 text-sm font-bold text-blue-700 hover:underline">Découvrir le Cabinet →</button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Mission tab */}
      {tab === 'mission' && (
        <div>
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid lg:grid-cols-3 gap-8 mb-16">
                {[
                  {
                    icon: '🎯',
                    title: 'Notre Mission',
                    color: 'blue',
                    text: 'Représenter et défendre les personnes handicapées, promouvoir leurs droits et contribuer à l’amélioration durable de leurs conditions de vie.',
                  },
                  {
                    icon: '🌟',
                    title: 'Notre Vision',
                    color: 'slate',
                    text: 'Une Côte d’Ivoire où le handicap ne limite ni les droits ni les ambitions.',
                  },
                  {
                    icon: '📋',
                    title: 'Notre Mandat',
                    color: 'slate',
                    text: 'Assurer la représentation nationale et internationale des OPH ivoiriennes, coordonner les actions collectives, animer les délégations régionales, produire et diffuser de l\'information sur le handicap, et accompagner la mise en œuvre de la CDPH en Côte d\'Ivoire.',
                  },
                ].map(item => (
                  <div key={item.title} className={`p-8 rounded-2xl ${item.color === 'blue' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-900'}`}>
                    <div className="text-3xl mb-4" aria-hidden="true">{item.icon}</div>
                    <h3 className={`text-xl font-bold font-display mb-4 ${item.color === 'blue' ? 'text-white' : 'text-slate-900'}`}>{item.title}</h3>
                    <p className={`leading-relaxed text-sm ${item.color === 'blue' ? 'text-blue-100' : 'text-slate-600'}`}>{item.text}</p>
                  </div>
                ))}
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900 font-display mb-8 text-center">Nos valeurs fondamentales</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {values.map(v => (
                    <div key={v.title} className="flex gap-4 p-5 rounded-xl border border-slate-200">
                      <div className="text-2xl flex-shrink-0" aria-hidden="true">{v.icon}</div>
                      <div>
                        <h4 className="font-bold text-slate-900 font-display mb-1">{v.title}</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">{v.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Gouvernance tab */}
      {tab === 'gouvernance' && (
        <div>
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold text-slate-900 font-display mb-3">Responsables institutionnels</h2>
                <p className="text-slate-500 max-w-xl mx-auto text-sm">Seules les responsabilités confirmées dans les documents de référence sont présentées.</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
                {leadership.map(p => (
                  <div key={p.name} className="flex gap-4 p-5 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 font-display flex-shrink-0">
                      {p.name.split(' ').slice(-1)[0][0]}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm font-display">{p.name}</div>
                      <div className="text-blue-600 text-xs font-medium mb-1">{p.role}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 rounded-2xl p-8">
                <h3 className="text-xl font-bold text-slate-900 font-display mb-6">Organes de gouvernance</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[
                    { title: 'Assemblée générale', desc: 'Instance de gouvernance réunissant les organisations membres.' },
                    { title: 'Conseil d’administration', desc: 'Composé de 16 membres, dont huit femmes et huit hommes.' },
                    { title: 'Conseil de surveillance', desc: 'Organe prévu dans la gouvernance institutionnelle de la CAPH-CI.' },
                    { title: 'Direction exécutive', desc: 'Assure la mise en œuvre et le suivi des orientations de l’organisation.' },
                    { title: 'Délégations territoriales et organisations affiliées', desc: 'Assurent la représentation et l’action de proximité sur le territoire.' },
                  ].map(o => (
                    <div key={o.title} className="p-4 rounded-xl bg-white border border-slate-200">
                      <h4 className="font-bold text-slate-900 text-sm font-display mb-2">{o.title}</h4>
                      <p className="text-slate-500 text-xs leading-relaxed">{o.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

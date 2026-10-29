import PageHero from '../components/PageHero';
import { useNavigation } from '../context/NavigationContext';
import QueryState from '../components/QueryState';
import { useResources } from '../hooks/queries';
import type { Resource } from '../types';

const keyFigures = [
  { value: '+50 000', label: 'membres', detail: 'Une communauté mobilisée' },
  { value: '45', label: 'délégations', detail: 'Régionales et communales' },
  { value: '37', label: 'organisations affiliées', detail: 'Un réseau national' },
  { value: '+3 millions', label: 'personnes touchées', detail: 'Par les campagnes, projets et actions' },
  { value: '+20', label: 'projets réalisés', detail: 'Dans des domaines essentiels' },
  { value: 'Depuis 2011', label: 'engagement', detail: 'Pour les droits, la dignité et l’inclusion' },
];

const indicators = [
  { value: '+500', label: 'Personnes handicapées formées et accompagnées', detail: 'Vers l’auto-emploi et l’autonomie économique' },
  { value: '400', label: 'Personnes formées en aviculture', detail: 'Dans dix villes de Côte d’Ivoire' },
  { value: '+1 000', label: 'Fauteuils roulants distribués', detail: 'Pour renforcer la mobilité et l’autonomie' },
  { value: '+5 000', label: 'Prises en charge psychosociales', detail: 'Écoute, orientation, soutien et accompagnement' },
];

const achievements = [
  'Plus de 500 cannes anglaises et béquilles distribuées.',
  'Plus de 300 cannes blanches remises à des personnes déficientes visuelles.',
  'Plus de 20 prothèses et orthèses réalisées.',
  '200 000 masques distribués pendant la pandémie de COVID-19.',
];

const testimonials = [
  {
    quote: 'La formation m’a permis de reprendre confiance, de structurer mon projet et de trouver mes premiers clients. Aujourd’hui, je peux vivre de mon activité et accompagner d’autres jeunes.',
    name: 'Awa K.',
    role: 'Entrepreneure, bénéficiaire du programme EMPLOI+CI',
    location: 'Abidjan',
    impact: 'Insertion professionnelle',
    image: 'https://images.unsplash.com/photo-1747214300383-81342dfa5f8e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    alt: 'Jeune femme souriante en fauteuil roulant',
  },
  {
    quote: 'Les aménagements et la formation des enseignants ont changé le quotidien de toute l’école. Les enfants participent davantage et les familles se sentent enfin écoutées.',
    name: 'Jean-Baptiste K.',
    role: 'Parent d’élève engagé dans une école inclusive',
    location: 'Bouaké',
    impact: 'Éducation inclusive',
    image: 'https://images.unsplash.com/photo-1601589813080-84c5e230cc18?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    alt: 'Portrait d’un homme assis portant une chemise bleue',
  },
  {
    quote: 'Grâce au travail mené avec les associations locales, notre communauté comprend mieux les droits des personnes handicapées. Nous sommes désormais associés aux décisions qui nous concernent.',
    name: 'Collectif des OPH locales',
    role: 'Organisations partenaires de la CAPH-CI',
    location: 'Régions de Côte d’Ivoire',
    impact: 'Mobilisation communautaire',
    image: 'https://images.unsplash.com/photo-1749066258753-622fb47eb88e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    alt: 'Groupe de personnes réunies dans leur communauté',
  },
];

function TransparencyPageContent({ resources }: { resources: Resource[] }) {
  const { navigate } = useNavigation();
  const reports = resources.filter(resource => resource.category === 'Rapports').slice(0, 3);

  return (
    <>
      <PageHero
        title="Transparence & Impact"
        subtitle="Des résultats accessibles, des indicateurs vérifiables et une information claire sur l’utilisation de nos ressources."
        breadcrumbs={[{ label: 'Transparence & Impact' }]}
      />

      <section className="py-12 bg-white" aria-labelledby="overview-title">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mb-10">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">Notre engagement</p>
            <h2 id="overview-title" className="text-3xl font-bold text-slate-900 font-display mb-4">Rendre compte de notre action</h2>
            <p className="text-slate-600 leading-relaxed">
              La CAPH-CI publie progressivement les résultats de ses programmes, ses indicateurs d’impact et les informations financières destinées au public. Cette démarche permet à chacun de suivre les avancées, les réalisations et les ressources mobilisées en faveur de l’inclusion.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {keyFigures.map(figure => (
              <div key={figure.label} className="rounded-xl border border-slate-200 p-5 bg-slate-50">
                <div className="text-3xl font-extrabold text-blue-700 font-display">{figure.value}</div>
                <div className="font-semibold text-slate-900 text-sm mt-1">{figure.label}</div>
                <div className="text-xs text-slate-500 mt-2">{figure.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-slate-50 border-y border-slate-200" aria-labelledby="indicators-title">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">Suivi des résultats</p>
              <h2 id="indicators-title" className="text-2xl font-bold text-slate-900 font-display">Indicateurs d’impact</h2>
            </div>
            <span className="text-xs font-medium text-slate-500">Source : « La CAPH-CI en chiffres »</span>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {indicators.map(indicator => (
              <div key={indicator.label} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="text-3xl font-extrabold text-blue-700 font-display">{indicator.value}</div>
                <h3 className="font-bold text-slate-900 font-display mt-2">{indicator.label}</h3>
                <p className="text-sm text-slate-500 mt-2">{indicator.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">Couverture nationale</p>
              <h2 className="text-2xl font-bold text-slate-900 font-display mb-5">Zones d’intervention</h2>
              <div className="rounded-2xl bg-slate-900 text-white p-7">
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  La CAPH-CI agit sur le territoire national grâce à un réseau de 45 délégations régionales et communales. Le détail des implantations sera publié après validation de l’annuaire officiel.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-medium">Territoire national</span>
                  <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-medium">45 délégations régionales et communales</span>
                </div>
                <button onClick={() => navigate('delegations')} className="mt-7 text-sm font-semibold text-blue-300 hover:text-white transition-colors">
                  Explorer nos délégations →
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">Sur le terrain</p>
              <h2 className="text-2xl font-bold text-slate-900 font-display mb-5">Réalisations majeures</h2>
              <ul className="grid sm:grid-cols-2 gap-3">
                {achievements.map(item => (
                  <li key={item} className="flex gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-600 leading-relaxed">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('projects')} className="mt-6 text-sm font-semibold text-blue-700 hover:underline">
                Consulter les résultats par projet →
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 bg-slate-50 border-y border-slate-200" aria-labelledby="testimonials-title">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mb-8">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">Paroles du terrain</p>
            <h2 id="testimonials-title" className="text-2xl font-bold text-slate-900 font-display mb-3">Des parcours et des communautés transformés</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Derrière chaque indicateur, il y a des personnes, des familles et des communautés. Leurs témoignages permettent de comprendre les changements concrets produits par les actions de la CAPH-CI.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map(testimonial => (
              <article key={testimonial.name} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="relative h-52 overflow-hidden bg-slate-100">
                  <img src={testimonial.image} alt={testimonial.alt} className="w-full h-full object-cover" />
                  <div className="absolute left-4 bottom-4">
                    <span className="inline-flex rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">{testimonial.impact}</span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <svg className="w-8 h-8 text-blue-200 mb-4" fill="currentColor" viewBox="0 0 32 32" aria-hidden="true">
                    <path d="M6.4 8C3.2 10.4 1.6 13.2 1.6 16.4c0 4.4 2.8 7.6 7.2 7.6 3.2 0 5.6-2.4 5.6-5.6 0-3.2-2.4-5.2-5.2-5.2-.4 0-.8 0-1.2.4.8-2 2.4-3.6 4.4-4.8L6.4 8Zm16 0c-3.2 2.4-4.8 5.2-4.8 8.4 0 4.4 2.8 7.6 7.2 7.6 3.2 0 5.6-2.4 5.6-5.6 0-3.2-2.4-5.2-5.2-5.2-.4 0-.8 0-1.2.4.8-2 2.4-3.6 4.4-4.8L22.4 8Z" />
                  </svg>
                  <blockquote className="flex-1 text-sm text-slate-700 leading-relaxed">« {testimonial.quote} »</blockquote>
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <div className="font-bold text-slate-900 font-display text-sm">{testimonial.name}</div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{testimonial.role}</div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 mt-2">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                      </svg>
                      {testimonial.location}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-5 text-xs text-slate-500">
            Contenus et identités présentés à titre illustratif pour la maquette. Les témoignages définitifs seront publiés avec l’accord des personnes concernées.
          </p>
        </div>
      </section>

      <section className="py-14 bg-blue-50 border-y border-blue-100" aria-labelledby="finance-title">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-5 gap-10 items-start">
            <div className="lg:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">Redevabilité</p>
              <h2 id="finance-title" className="text-2xl font-bold text-slate-900 font-display mb-4">Informations financières publiques</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Les informations financières ne seront publiées qu’après validation par les instances habilitées de la CAPH-CI.
              </p>
            </div>
            <div className="lg:col-span-3 rounded-2xl bg-white border border-blue-200 p-6">
              <div className="flex gap-4">
                <svg className="w-7 h-7 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10 3h4l7 18H3L10 3Z" />
                </svg>
                <div>
                  <h3 className="font-bold text-slate-900 font-display">Informations en attente de validation</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">Aucune ventilation financière n’est affichée dans la maquette tant que les données publiques officielles et leur période de référence ne sont pas confirmées.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 bg-white" aria-labelledby="reports-title">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">Documents publics</p>
              <h2 id="reports-title" className="text-2xl font-bold text-slate-900 font-display">Rapports d’activités et rapports annuels</h2>
            </div>
            <button onClick={() => navigate('resources')} className="text-sm font-semibold text-blue-700 hover:underline">Voir toutes les ressources →</button>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {reports.map(report => (
              <button key={report.id} onClick={() => navigate('resource-detail', report.id)} className="group text-left rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-5" aria-hidden="true">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h7l5 5v13H7V3Zm7 0v5h5M10 13h6m-6 4h6" />
                  </svg>
                </div>
                <div className="text-xs font-semibold text-blue-700 mb-2">{report.date} · {report.type}</div>
                <h3 className="font-bold text-slate-900 font-display line-clamp-2">{report.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-3 line-clamp-2">{report.description}</p>
                <span className="inline-block text-xs font-semibold text-blue-700 mt-5 group-hover:underline">Consulter le rapport →</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default function TransparencyPage(props: Omit<Parameters<typeof TransparencyPageContent>[0], 'resources'>) {
  const q_resources = useResources();
  return (
    <QueryState queries={[q_resources]}>
      {() => <TransparencyPageContent {...props} resources={q_resources.data!} />}
    </QueryState>
  );
}

import { useState } from 'react';
import PageHero from '../components/PageHero';
import { useNavigation } from '../context/NavigationContext';
import QueryState from '../components/QueryState';
import { useDomains, useProjects } from '../hooks/queries';
import type { Domain, Project } from '../types';

const domainDetails: Record<string, { tagline: string; commitments: string[] }> = {
  droits: {
    tagline: 'Faire respecter les droits et entendre les voix.',
    commitments: ['Plaidoyer auprès des pouvoirs publics', 'Sensibilisation aux droits', 'Lutte contre les discriminations', 'Participation aux décisions qui concernent les personnes handicapées'],
  },
  emploi: {
    tagline: 'Valoriser les compétences, créer des opportunités.',
    commitments: ['Accès à la formation et à l’emploi', 'Accompagnement à l’entrepreneuriat', 'Autonomie financière', 'Promotion du recrutement inclusif auprès des entreprises'],
  },
  education: {
    tagline: 'Donner à chacun la possibilité d’apprendre et de réussir.',
    commitments: ['Accès à une éducation adaptée', 'Alphabétisation', 'Formation professionnelle', 'Amélioration de l’accueil des apprenants handicapés'],
  },
  sante: {
    tagline: 'Faciliter l’accès aux soins et à un accompagnement adapté.',
    commitments: ['Prévention et sensibilisation', 'Orientation vers les services de santé', 'Accès à la réadaptation', 'Protection sociale et dispositifs d’accompagnement'],
  },
  accessibilite: {
    tagline: 'Rendre les espaces, les services et les déplacements accessibles à tous.',
    commitments: ['Accessibilité des bâtiments', 'Transports et mobilité', 'Équipements et services accessibles', 'Accompagnement des organisations et institutions'],
  },
  numerique: {
    tagline: 'Mettre les technologies au service de l’inclusion.',
    commitments: ['Technologies adaptées', 'Formation aux compétences numériques', 'Solutions innovantes', 'Supports adaptés, langue des signes et communication accessible'],
  },
  paix: {
    tagline: 'Rompre l’isolement et renforcer les solidarités.',
    commitments: ['Écoute et orientation', 'Soutien social aux personnes et aux familles', 'Mobilisation communautaire', 'Participation culturelle, sportive et citoyenne'],
  },
  developpement: {
    tagline: 'Des organisations plus fortes pour mieux défendre leurs membres.',
    commitments: ['Renforcement de la gouvernance', 'Développement des compétences', 'Conseil et formation', 'Mise en réseau et capacité à conduire des projets'],
  },
};

type Props = { detail?: boolean };

function ActionsPageContent({ detail, domains, projects }: Props & { domains: Domain[]; projects: Project[] }) {
  const { navigate, selectedId } = useNavigation();
  const [selected, setSelected] = useState<string | null>(selectedId ?? null);

  const selectedDomain = domains.find(d => d.id === selected);
  const selectedDetails = selected ? domainDetails[selected] : null;

  if (detail && selectedDomain && selectedDetails) {
    return (
      <>
        <PageHero
          title={selectedDomain.title}
          subtitle={selectedDomain.description}
          breadcrumbs={[{ label: 'Nos actions', page: 'actions' }, { label: selectedDomain.title }]}
        />
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <div className="text-5xl mb-4" aria-hidden="true">{selectedDomain.icon}</div>
                  <p className="text-xl font-bold text-blue-700 font-display mb-5">{selectedDetails.tagline}</p>
                  <h2 className="text-2xl font-bold text-slate-900 font-display mb-4">Notre engagement</h2>
                  <ul className="space-y-3">
                    {selectedDetails.commitments.map(o => (
                      <li key={o} className="flex gap-3 items-start">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5" aria-hidden="true">✓</span>
                        <span className="text-slate-600 text-sm">{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-display mb-4">Projets dans ce domaine</h2>
                  <div className="space-y-3">
                    {projects.filter(p => p.domain === selectedDomain.title).map(p => (
                      <button key={p.id} onClick={() => navigate('project-detail', p.id)} className="w-full text-left flex gap-4 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors group">
                        <img src={p.image} alt={p.title} className="w-16 h-12 object-cover rounded flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 text-sm font-display line-clamp-1">{p.title}</div>
                          <div className="text-slate-500 text-xs">{p.region} · {p.status}</div>
                        </div>
                        <span className="text-blue-600 text-xs ml-auto font-medium group-hover:underline whitespace-nowrap">Voir →</span>
                      </button>
                    ))}
                    {projects.filter(p => p.domain === selectedDomain.title).length === 0 && (
                      <p className="text-slate-400 text-sm">Aucun projet associé actuellement.</p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <div className="sticky top-24 space-y-5">
                  <div className="p-5 rounded-xl bg-blue-600 text-white">
                    <h3 className="font-bold font-display mb-3">Principe d’action</h3>
                    <p className="text-blue-100 text-sm leading-relaxed">Agir sur les obstacles, valoriser les capacités et ouvrir davantage d’opportunités aux personnes handicapées.</p>
                  </div>
                  <div className="p-5 rounded-xl border border-slate-200 space-y-3">
                    <h3 className="font-bold font-display text-slate-900">Vous souhaitez agir ?</h3>
                    <button onClick={() => navigate('partner')} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">Devenir partenaire</button>
                    <button onClick={() => navigate('donate')} className="w-full py-2.5 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">Faire un don</button>
                    <button onClick={() => navigate('contact')} className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Nous contacter</button>
                  </div>
                </div>
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
        title="Nos domaines d'action"
        subtitle="Des actions concrètes pour une inclusion durable : agir sur les obstacles, valoriser les capacités et ouvrir davantage d’opportunités."
        breadcrumbs={[{ label: 'Nos actions' }]}
      />
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {domains.map((d, i) => (
              <button
                key={d.id}
                onClick={() => { setSelected(d.id); navigate('action-detail', d.id); }}
                className="group text-left p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all bg-white"
              >
                <div className="text-3xl mb-3" aria-hidden="true">{d.icon}</div>
                <div className="text-xs text-blue-600 font-bold mb-2 font-display tracking-wider">DOMAINE 0{i + 1}</div>
                <h3 className="font-bold text-slate-900 font-display mb-3">{d.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed mb-4">{d.description}</p>
                <span className="text-blue-600 text-xs font-semibold group-hover:underline">Découvrir ce domaine →</span>
              </button>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 bg-slate-50 rounded-2xl p-10 text-center">
            <h2 className="text-2xl font-bold text-slate-900 font-display mb-4">Vous souhaitez vous engager ?</h2>
            <p className="text-slate-600 mb-6 max-w-xl mx-auto text-sm">Que ce soit en tant que partenaire technique, financier ou bénévole, votre soutien peut transformer la vie de milliers de personnes handicapées en Côte d'Ivoire.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => navigate('partner')} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm">Devenir partenaire</button>
              <button onClick={() => navigate('donate')} className="px-5 py-2.5 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors text-sm">Faire un don</button>
              <button onClick={() => navigate('contact')} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:border-slate-400 transition-colors text-sm">Nous contacter</button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function ActionsPage(props: Omit<Parameters<typeof ActionsPageContent>[0], 'domains' | 'projects'>) {
  const q_domains = useDomains();
  const q_projects = useProjects();
  return (
    <QueryState queries={[q_domains, q_projects]}>
      {() => <ActionsPageContent {...props} domains={q_domains.data!} projects={q_projects.data!} />}
    </QueryState>
  );
}

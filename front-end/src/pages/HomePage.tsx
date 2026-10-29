import { useNavigation } from '../context/NavigationContext';
import QueryState from '../components/QueryState';
import { useDomains, useNews, useOpportunities, useProjects } from '../hooks/queries';
import type { Domain, NewsItem, Opportunity, Project } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-0.5 bg-blue-600 rounded" aria-hidden="true" />
      <span className="text-xs font-bold tracking-widest uppercase text-blue-600 font-display">{label}</span>
    </div>
  );
}

const statusColor = (s: string) =>
  s === 'En cours' ? 'bg-green-100 text-green-700' : s === 'Terminé' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700';

// ─── Impact stats (hardcoded per brief) ──────────────────────────────────────

const impactStats = [
  { value: '+50 000', label: 'Membres', sub: 'personnes représentées' },
  { value: '45', label: 'Délégations', sub: 'régionales et communales' },
  { value: '37', label: 'Organisations affiliées', sub: 'un réseau national' },
  { value: '+3 millions', label: 'Personnes touchées', sub: 'par nos actions' },
  { value: '+20', label: 'Projets réalisés', sub: 'dans des domaines essentiels' },
  { value: 'Depuis 2011', label: 'Engagement', sub: 'pour les droits et la dignité' },
];

const officialAchievements = [
  { value: '+500', label: 'personnes formées et accompagnées', detail: 'Vers l’auto-emploi et l’autonomie économique.' },
  { value: '400', label: 'personnes formées en aviculture', detail: 'Dans dix villes de Côte d’Ivoire.' },
  { value: '+1 000', label: 'fauteuils roulants distribués', detail: 'Pour faciliter les déplacements et l’autonomie.' },
  { value: '+500', label: 'cannes anglaises et béquilles', detail: 'Distribuées pour améliorer la mobilité.' },
  { value: '+300', label: 'cannes blanches remises', detail: 'Aux personnes déficientes visuelles.' },
  { value: '+20', label: 'prothèses et orthèses réalisées', detail: 'Pour répondre à des besoins d’appareillage.' },
  { value: '+5 000', label: 'prises en charge psychosociales', detail: 'Écoute, orientation, soutien et accompagnement.' },
  { value: '200 000', label: 'masques distribués', detail: 'Pendant la pandémie de COVID-19.' },
];

// ─── Component ───────────────────────────────────────────────────────────────

function HomePageContent({ domains, projects, newsItems, opportunities }: { domains: Domain[]; projects: Project[]; newsItems: NewsItem[]; opportunities: Opportunity[] }) {
  const { navigate } = useNavigation();

  return (
    <>
      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section
        className="relative min-h-[88vh] flex items-center bg-slate-900 overflow-hidden"
        aria-label="Présentation CAPH-CI"
      >
        {/* Background photo */}
        <img
          src="/hero-accueil.jpg"
          alt="Photo de groupe réunissant des membres et partenaires de la CAPH-CI"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/55 to-transparent"
          aria-hidden="true"
        />
        {/* Blue accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center w-full">
          {/* Left — copy */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-600/15 border border-blue-500/25 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" aria-hidden="true" />
              <span className="text-white text-sm font-bold">Portail national du handicap · Côte d'Ivoire</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl font-bold text-white font-display leading-tight mb-6">
              Ensemble pour une<br />
              <span className="text-[#FFD600]">Côte d'Ivoire inclusive</span>
            </h1>

            {/* Sub */}
            <p className="text-white text-lg max-w-xl leading-relaxed mb-10">
              Unir nos forces, défendre nos droits et construire une société dans laquelle les personnes handicapées peuvent exercer pleinement leurs droits, développer leurs compétences et participer à la vie collective.
            </p>

            {/* 4 CTAs */}
            <div className="flex flex-wrap gap-3 mb-10">
              <button
                onClick={() => navigate('about')}
                className="px-5 py-2.5 bg-white text-slate-900 rounded-lg font-semibold text-sm hover:bg-slate-100 transition-colors"
              >
                Découvrir la CAPH-CI
              </button>
              <button
                onClick={() => navigate('actions')}
                className="px-5 py-2.5 border border-white/25 text-white rounded-lg font-semibold text-sm hover:bg-white/10 transition-colors"
              >
                Nos actions
              </button>
              <button
                onClick={() => navigate('adhesion')}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
              >
                Adhérer
              </button>
              <button
                onClick={() => navigate('partner')}
                className="px-5 py-2.5 border border-white/40 text-white rounded-lg font-semibold text-sm hover:bg-white/10 transition-colors"
              >
                Devenir partenaire
              </button>
              <button
                onClick={() => navigate('donate')}
                className="px-5 py-2.5 bg-blue-600/80 border border-blue-400 text-white rounded-lg font-semibold text-sm hover:bg-blue-600 transition-colors"
              >
                Faire un don
              </button>
            </div>

            {/* Trust line */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-100">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden="true" />Organisation nationale de la société civile</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#FFD600]" aria-hidden="true" />Laïque et apolitique</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#F56600]" aria-hidden="true" />À but non lucratif</span>
            </div>
          </div>

          {/* Right — quick access */}
          <div className="hidden lg:flex flex-col gap-3">
            {[
              { icon: '📰', label: 'Dernières actualités', sub: newsItems[0]?.title, page: 'news' as const },
              { icon: '💡', label: 'Opportunités disponibles', sub: `${opportunities.length} offres actives`, page: 'opportunities' as const },
              { icon: '📍', label: 'Trouver une délégation', sub: '45 délégations régionales et communales', page: 'delegations' as const },
              { icon: '🏢', label: 'Annuaire des OPH membres', sub: '37 organisations affiliées', page: 'oph' as const },
              { icon: '📋', label: 'Suivre ma demande d\'adhésion', sub: 'Accès espace OPH', page: 'adhesion' as const },
            ].map(item => (
              <button
                key={item.page + item.label}
                onClick={() => navigate(item.page)}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/6 hover:bg-white/12 border border-white/8 transition-all text-left group"
              >
                <span className="text-2xl w-9 text-center flex-shrink-0" aria-hidden="true">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm font-display">{item.label}</div>
                  <div className="text-white/90 text-xs font-medium truncate mt-0.5">{item.sub}</div>
                </div>
                <svg className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500" aria-hidden="true">
          <div className="w-5 h-8 rounded-full border border-slate-700 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-blue-500 animate-bounce" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          IMPACT STATS
      ══════════════════════════════════════════ */}
      <section className="bg-[#006B35]" aria-label="Chiffres clés de la CAPH-CI">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 divide-x divide-white/15 divide-y">
            {impactStats.map((s, i) => (
              <div key={i} className="py-8 px-6 text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white font-display mb-1">{s.value}</div>
                <div className="text-blue-100 text-sm font-semibold mb-0.5">{s.label}</div>
                <div className="text-blue-300 text-xs">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50" aria-labelledby="achievements-title">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-10">
            <SectionLabel label="Notre impact" />
            <h2 id="achievements-title" className="text-3xl sm:text-4xl font-bold text-slate-900 font-display mb-4">Des actions concrètes, des vies transformées</h2>
            <p className="text-slate-600 leading-relaxed">Depuis 2011, les actions de la CAPH-CI facilitent l’accès à la formation, à l’autonomie, à la mobilité et à l’accompagnement psychosocial.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {officialAchievements.map(item => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="text-2xl font-extrabold text-blue-700 font-display">{item.value}</div>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{item.label}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-3">{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <button onClick={() => navigate('transparency')} className="min-h-11 px-6 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-800 transition-colors">Découvrir notre impact</button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          À PROPOS
      ══════════════════════════════════════════ */}
      <section className="py-20 bg-white" aria-label="À propos de la CAPH-CI">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <SectionLabel label="Qui sommes-nous ?" />
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display mb-6 leading-tight">
                La voix nationale des personnes handicapées de Côte d'Ivoire
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Créée en 2011, la CAPH-CI est l'organisation faîtière nationale qui fédère les organisations de personnes handicapées à travers tout le territoire ivoirien. Notre mission : défendre les droits, promouvoir l'autonomie et accompagner la pleine participation des personnes handicapées au développement.
              </p>
              <p className="text-slate-600 leading-relaxed mb-8">
                Nous travaillons en partenariat avec les pouvoirs publics, les organisations internationales et le secteur privé pour faire du handicap une priorité nationale et transformer concrètement les conditions de vie des personnes handicapées en Côte d'Ivoire.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => navigate('about')} className="px-5 py-2.5 bg-[#006B35] text-white rounded-lg font-semibold hover:bg-[#004D29] transition-colors text-sm">
                  En savoir plus
                </button>
                <button onClick={() => navigate('gouvernance')} className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:border-blue-400 hover:text-blue-600 transition-colors text-sm">
                  Gouvernance & Équipe
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '🎯', title: 'Mission', text: 'Fédérer et représenter les OPH, porter leur voix auprès des institutions nationales et internationales.' },
                { icon: '🌟', title: 'Vision', text: 'Une Côte d\'Ivoire inclusive où toute personne peut vivre, apprendre, travailler et participer pleinement.' },
                { icon: '⚖️', title: 'Plaidoyer', text: 'Défense active des droits des personnes handicapées auprès des pouvoirs publics et des partenaires.' },
                { icon: '🌐', title: 'Réseau', text: 'Cohésion entre organisations membres, partage d\'expériences et mutualisation des ressources à l\'échelle nationale.' },
              ].map(v => (
                <div key={v.title} className="p-5 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-colors group">
                  <div className="text-2xl mb-3" aria-hidden="true">{v.icon}</div>
                  <div className="font-bold text-slate-900 text-sm font-display mb-2 group-hover:text-blue-600 transition-colors">{v.title}</div>
                  <p className="text-slate-600 text-xs leading-relaxed">{v.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          DOMAINES D'INTERVENTION (8 cartes)
      ══════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50" aria-label="Nos domaines d'intervention">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <SectionLabel label="Nos actions" />
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display mb-4">
              8 domaines d'intervention
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm leading-relaxed">
              La CAPH-CI agit sur huit priorités stratégiques pour une inclusion réelle, durable et mesurable des personnes handicapées en Côte d'Ivoire.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {domains.map((d, i) => (
              <button
                key={d.id}
                onClick={() => navigate('action-detail', d.id)}
                className="group text-left p-5 rounded-xl bg-white border border-slate-200 hover:border-[#006B35] hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl group-hover:bg-blue-100 transition-colors" aria-hidden="true">
                    {d.icon}
                  </div>
                  <span className="text-xs font-bold text-slate-300 font-display">0{i + 1}</span>
                </div>
                <div className="font-bold text-slate-900 text-sm font-display mb-2 group-hover:text-[#006B35] transition-colors">{d.title}</div>
                <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-3">{d.description}</p>
                <span className="text-[#006B35] text-xs font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Découvrir
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => navigate('actions')}
              className="px-7 py-3 border-2 border-[#006B35] text-[#006B35] rounded-lg font-semibold hover:bg-[#006B35] hover:text-white transition-colors text-sm"
            >
              Voir toutes nos actions & programmes
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CABINET DE CONSEIL EN SOLUTIONS HANDICAP
      ══════════════════════════════════════════ */}
      <section className="py-20 bg-white overflow-hidden" aria-label="Cabinet de conseil CAPH-CI">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-2xl bg-gradient-to-br from-[#1A1A1A] via-[#004D29] to-[#004D29] overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Left content */}
              <div className="p-10 lg:p-14">
                <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 mb-6">
                  <span className="text-blue-300 text-xs font-semibold tracking-wide">B2B · RSE · ACCESSIBILITÉ</span>
                </div>
                <h2 className="text-3xl font-bold text-white font-display mb-4 leading-tight">
                  Cabinet CAPH-CI Conseil<br />
                  <span className="text-blue-300">en Solutions Handicap</span>
                </h2>
                <p className="text-slate-300 leading-relaxed mb-8 text-sm">
                  Accompagnez votre organisation vers une inclusion réelle et mesurable. Notre cabinet propose des prestations de conseil, audit d'accessibilité, formation RSE et certification pour les entreprises, institutions publiques et organisations internationales.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  {[
                    { icon: '🔍', label: 'Audits accessibilité', desc: 'Web, physique & numérique' },
                    { icon: '🎓', label: 'Formations RSE', desc: 'Management inclusif' },
                    { icon: '📋', label: 'Stratégie handicap', desc: 'Politique & gouvernance' },
                    { icon: '🏅', label: 'Certification', desc: 'Label Emploi Inclusif' },
                  ].map(s => (
                    <div key={s.label} className="p-3.5 rounded-xl bg-white/8 border border-white/10">
                      <div className="text-lg mb-1.5" aria-hidden="true">{s.icon}</div>
                      <div className="text-white text-xs font-semibold font-display">{s.label}</div>
                      <div className="text-slate-400 text-xs">{s.desc}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate('cabinet')}
                    className="px-6 py-3 bg-white text-[#004D29] rounded-xl font-bold hover:bg-blue-50 transition-colors text-sm"
                  >
                    Demander un devis
                  </button>
                  <button
                    onClick={() => navigate('cabinet')}
                    className="px-6 py-3 border border-white/25 text-white rounded-xl font-semibold hover:bg-white/10 transition-colors text-sm"
                  >
                    Découvrir nos services
                  </button>
                </div>
              </div>

              {/* Right — stats column */}
              <div className="hidden lg:flex flex-col justify-center p-10 lg:p-14 border-l border-white/10">
                <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase mb-8">Pourquoi nous choisir</p>
                <div className="space-y-6">
                  {[
                    { num: '10+', label: 'Années d\'expertise', sub: 'Inclusion du handicap en Côte d\'Ivoire' },
                    { num: '50+', label: 'Entreprises accompagnées', sub: 'PME, grandes entreprises, institutions' },
                    { num: '100%', label: 'Impact direct', sub: 'Vos honoraires financent nos actions terrain' },
                  ].map(s => (
                    <div key={s.label} className="flex items-start gap-4">
                      <div className="text-3xl font-bold text-blue-400 font-display w-16 flex-shrink-0">{s.num}</div>
                      <div>
                        <div className="font-bold text-white text-sm font-display">{s.label}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{s.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Premier échange gratuit et confidentiel.<br />
                    Réponse sous 48h ouvrables.
                  </p>
                  <a href="mailto:caphci2011@gmail.com" className="mt-2 inline-flex items-center gap-1.5 text-blue-300 text-xs hover:text-white transition-colors font-medium">
                    <span>✉</span> caphci2011@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PROJETS RÉCENTS
      ══════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50" aria-label="Nos projets récents">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <SectionLabel label="Projets & Programmes" />
              <h2 className="text-3xl font-bold text-slate-900 font-display">Nos projets récents</h2>
            </div>
            <button onClick={() => navigate('projects')} className="hidden sm:flex items-center gap-1 text-blue-600 text-sm font-semibold hover:underline">
              Voir tous les projets
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.slice(0, 3).map(p => (
              <button
                key={p.id}
                onClick={() => navigate('project-detail', p.id)}
                className="group text-left rounded-xl overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                <div className="relative h-44 bg-slate-100 overflow-hidden">
                  <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(p.status)}`}>{p.status}</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-blue-600 font-medium">{p.domain}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500">{p.region}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm font-display line-clamp-2 mb-2">{p.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-4">{p.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{p.beneficiaries.toLocaleString('fr-FR')} bénéficiaires</span>
                    <span className="text-blue-600 text-xs font-semibold group-hover:underline">Voir le projet →</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          DÉLÉGATIONS
      ══════════════════════════════════════════ */}
      <section className="py-20 bg-[#006B35] text-white" aria-label="Nos délégations régionales">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionLabel label="Délégations régionales" />
              <h2 className="text-3xl font-bold font-display mb-4">Un réseau de proximité sur le territoire national</h2>
              <p className="text-blue-100 mb-6 leading-relaxed text-sm">
                La CAPH-CI dispose de 45 délégations statutaires qui assurent la présence et l'action de l'organisation au plus près des personnes handicapées, sur l'ensemble du territoire.
              </p>
              <div className="flex items-end gap-3 mb-8">
                <span className="text-6xl font-extrabold text-[#FFD600] font-display">45</span>
                <span className="text-blue-100 font-semibold pb-2">délégations régionales et communales</span>
              </div>
              <button
                onClick={() => navigate('delegations')}
                className="px-5 py-2.5 bg-white text-[#006B35] rounded-lg font-semibold hover:bg-blue-50 transition-colors text-sm"
              >
                Voir toutes les délégations
              </button>
            </div>

            {/* Stylized CI map */}
            <div className="bg-blue-700/30 border border-blue-500/30 rounded-2xl p-6" aria-label="Carte de Côte d'Ivoire avec délégations">
              <svg viewBox="0 0 100 110" className="w-full max-w-xs mx-auto" aria-hidden="true">
                <path
                  d="M20,10 L40,5 L60,8 L80,15 L88,30 L85,50 L78,65 L72,80 L65,90 L52,95 L42,93 L30,88 L20,78 L12,65 L10,48 L12,30 Z"
                  fill="rgba(255,255,255,0.08)"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="1.2"
                />
                <circle cx="50" cy="50" r="4" fill="#FFD600" />
                <circle cx="50" cy="50" r="1.5" fill="white" />
              </svg>
              <p className="mt-4 text-center text-xs text-blue-100">Localisations détaillées à intégrer après validation de l’annuaire officiel.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          ACTUALITÉS
      ══════════════════════════════════════════ */}
      <section className="py-20 bg-white" aria-label="Actualités et événements">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <SectionLabel label="Actualités" />
              <h2 className="text-3xl font-bold text-slate-900 font-display">Actualités & événements</h2>
            </div>
            <button onClick={() => navigate('news')} className="hidden sm:flex items-center gap-1 text-blue-600 text-sm font-semibold hover:underline">
              Toutes les actualités
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsItems.slice(0, 3).map(n => (
              <button
                key={n.id}
                onClick={() => navigate('news-detail', n.id)}
                className="group text-left rounded-xl overflow-hidden border border-slate-200 hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <div className="h-44 bg-slate-100 overflow-hidden">
                  <img src={n.image} alt={n.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">{n.category}</span>
                    <span className="text-xs text-slate-400">{n.date}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm font-display line-clamp-2 mb-2">{n.title}</h3>
                  <p className="text-slate-500 text-xs line-clamp-2 mb-3">{n.summary}</p>
                  <span className="text-blue-600 text-xs font-semibold group-hover:underline">Lire l'article →</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          OPPORTUNITÉS
      ══════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50" aria-label="Opportunités">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <SectionLabel label="Opportunités" />
              <h2 className="text-3xl font-bold text-slate-900 font-display">Emplois, Formations &amp; Financements</h2>
            </div>
            <button onClick={() => navigate('opportunities')} className="hidden sm:flex items-center gap-1 text-blue-600 text-sm font-semibold hover:underline">
              Voir toutes
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {opportunities.slice(0, 4).map(o => (
              <button
                key={o.id}
                onClick={() => navigate('opportunity-detail', o.id)}
                className="group text-left p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">{o.category}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm font-display line-clamp-2 mb-2">{o.title}</h3>
                <p className="text-slate-500 text-xs mb-3 font-medium">{o.organization}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <span aria-hidden="true">📍</span><span>{o.region}</span>
                  </div>
                  <span className="text-xs text-red-500 font-medium">→ {o.deadline}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA FINAL
      ══════════════════════════════════════════ */}
      <section className="py-20 bg-[#1A1A1A] text-white" aria-label="Rejoindre la CAPH-CI">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/15 border border-blue-500/25 rounded-full px-4 py-1.5 mb-8">
            <span className="text-blue-400 text-xs font-semibold tracking-wide">ENSEMBLE POUR L'INCLUSION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-display mb-5 leading-tight">
            Rejoignez le mouvement pour<br />
            <span className="text-blue-400">l'inclusion et l'accessibilité</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Que vous soyez une organisation de personnes handicapées, une entreprise, un citoyen ou un partenaire international — votre engagement compte. Ensemble, construisons une Côte d'Ivoire accessible à toutes et à tous.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate('adhesion')}
              className="px-7 py-3.5 bg-[#006B35] text-white rounded-xl font-bold hover:bg-[#004D29] transition-colors"
            >
              ➕ Adhérer à la CAPH-CI
            </button>
            <button
              onClick={() => navigate('partner')}
              className="px-7 py-3.5 border border-white/25 text-white rounded-xl font-semibold hover:bg-white/10 transition-colors"
            >
              🤝 Devenir partenaire
            </button>
            <button
              onClick={() => navigate('donate')}
              className="px-7 py-3.5 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-colors"
            >
              ❤️ Faire un don
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export default function HomePage(props: Omit<Parameters<typeof HomePageContent>[0], 'domains' | 'projects' | 'newsItems' | 'opportunities'>) {
  const q_domains = useDomains();
  const q_projects = useProjects();
  const q_newsItems = useNews();
  const q_opportunities = useOpportunities();
  return (
    <QueryState queries={[q_domains, q_projects, q_newsItems, q_opportunities]}>
      {() => <HomePageContent {...props} domains={q_domains.data!} projects={q_projects.data!} newsItems={q_newsItems.data!} opportunities={q_opportunities.data!} />}
    </QueryState>
  );
}

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import PageHero from '../components/PageHero';
import { api } from '../api';
import { quoteSchema } from '../schemas/forms';
import { useZodForm } from '../components/forms/useZodForm';
import { a11y, ApiErrorAlert, ErrorSummary, FieldError } from '../components/forms/FormKit';
import { useNavigation } from '../context/NavigationContext';

const services = [
  { icon: '💼', title: 'Emploi inclusif & RSE', description: 'Accompagnement des entreprises dans leur démarche d\'inclusion professionnelle des personnes handicapées. Audit, stratégie RSE/ESG, recrutement inclusif, maintien dans l\'emploi.' },
  { icon: '🌐', title: 'Accessibilité numérique', description: 'Audit d\'accessibilité web (WCAG 2.2), recommandations, formation des équipes techniques, certification et mise en conformité des sites et applications.' },
  { icon: '♿', title: 'Accessibilité physique', description: 'Audit d\'accessibilité des locaux, bâtiments et espaces publics. Recommandations de mise en conformité selon les normes nationales et internationales.' },
  { icon: '🎓', title: 'Formation & Sensibilisation', description: 'Modules de formation sur mesure : sensibilisation au handicap, management inclusif, communication accessible, diversité et inclusion en milieu professionnel.' },
  { icon: '📋', title: 'Certification & Gouvernance', description: 'Accompagnement à la certification Emploi Inclusif, développement de politiques inclusion, formation des dirigeants et DRH, indicateurs RSE handicap.' },
  { icon: '🚀', title: 'Innovation & Technologies', description: 'Conseil en technologies d\'assistance, accessibilité des produits numériques, design universel, accompagnement de startups inclusives.' },
  { icon: '🏢', title: 'Développement organisationnel', description: 'Renforcement des capacités des OPH, structuration organisationnelle, gouvernance, planification stratégique, mobilisation de ressources.' },
  { icon: '💬', title: 'Communication accessible', description: 'Audit de communication, production de contenus accessibles (LSF, FALC, audiodescription, sous-titrage), formation aux bonnes pratiques.' },
];

const trainings = [
  {
    id: 't1',
    title: 'Sensibilisation au handicap en milieu professionnel',
    duration: '1 jour',
    level: 'Tous niveaux',
    price: 'Sur devis',
    format: 'Présentiel / Distanciel',
    description: 'Module clé en main pour sensibiliser les collaborateurs et managers au handicap : représentations, types de handicap, communication adaptée, bonnes pratiques RH.',
    objectives: ['Démystifier les représentations sur le handicap', 'Acquérir un vocabulaire approprié', 'Identifier les ajustements raisonnables possibles', 'Savoir accueillir et intégrer un collaborateur handicapé'],
    audience: 'Tous collaborateurs, managers, DRH',
    certification: false,
  },
  {
    id: 't2',
    title: 'Accessibilité numérique — standards WCAG 2.2',
    duration: '5 jours',
    level: 'Développeurs & UX',
    price: 'Sur devis',
    format: 'Présentiel / En ligne',
    description: 'Formation intensive sur les standards d\'accessibilité web : WCAG 2.2, ARIA, tests avec lecteurs d\'écran, outils d\'audit automatique, mise en conformité.',
    objectives: ['Maîtriser les 4 principes WCAG (POUR)', 'Utiliser les technologies d\'assistance en test', 'Auditer et corriger l\'accessibilité d\'une interface', 'Obtenir la certification d\'auditeur accessibilité'],
    audience: 'Développeurs web, designers UX/UI, chefs de projet digital',
    certification: true,
  },
  {
    id: 't3',
    title: 'Manager inclusif — Intégrer le handicap en équipe',
    duration: '2 jours',
    level: 'Managers & DRH',
    price: 'Sur devis',
    format: 'Présentiel',
    description: 'Formation pratique pour les managers et DRH : comment accueillir, maintenir dans l\'emploi et manager efficacement un collaborateur en situation de handicap.',
    objectives: ['Comprendre le cadre légal de l\'emploi des PH', 'Mener un entretien d\'intégration adapté', 'Identifier et mettre en place des aménagements de poste', 'Gérer les situations délicates avec bienveillance'],
    audience: 'Managers de proximité, DRH, responsables d\'équipe',
    certification: false,
  },
  {
    id: 't4',
    title: 'Communication accessible et inclusive',
    duration: '2 jours',
    level: 'Communicants',
    price: 'Sur devis',
    format: 'Présentiel / Distanciel',
    description: 'Apprenez à produire des contenus accessibles : documents Word et PDF, présentations, réseaux sociaux, vidéos avec sous-titres, langage simple (FALC).',
    objectives: ['Rédiger des documents accessibles', 'Créer des visuels conformes aux standards d\'accessibilité', 'Produire des vidéos accessibles (sous-titres, audiodescription)', 'Appliquer le FALC dans les communications institutionnelles'],
    audience: 'Chargés de communication, graphistes, community managers',
    certification: false,
  },
  {
    id: 't5',
    title: 'Stratégie RSE/ESG et handicap',
    duration: '1 jour',
    level: 'Dirigeants & DRH',
    price: 'Sur devis',
    format: 'Présentiel',
    description: 'Formation stratégique pour les dirigeants : comment intégrer le handicap dans la politique RSE/ESG, les reporting extra-financiers et la marque employeur.',
    objectives: ['Comprendre les enjeux RSE liés au handicap', 'Structurer un plan d\'action inclusion handicap', 'Piloter les indicateurs et le reporting handicap', 'Valoriser l\'engagement inclusion dans la communication externe'],
    audience: 'Dirigeants, DG, Directeurs RSE, DRH',
    certification: false,
  },
];

type Props = { showDevis?: boolean };

export default function CabinetPage({ showDevis }: Props) {
  const { navigate } = useNavigation();
  const [showForm, setShowForm] = useState(showDevis ?? false);
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, submitCount } } = useZodForm(quoteSchema, { organisation: '', contact: '', email: '', service: '', message: '' });
  const mutation = useMutation({ mutationFn: api.submitQuoteRequest, onSuccess: () => setSubmitted(true) });
  const onSubmit = handleSubmit(values => mutation.mutateAsync(values).catch(() => undefined));
  const [selectedTraining, setSelectedTraining] = useState<string | null>(null);

  const training = trainings.find(t => t.id === selectedTraining);

  // Training detail view
  if (selectedTraining && training) {
    return (
      <>
        <PageHero
          title={training.title}
          subtitle={`${training.duration} · ${training.format} · ${training.level}`}
          breadcrumbs={[{ label: 'Cabinet de Conseil', page: 'cabinet' }, { label: 'Formations', page: 'cabinet' }, { label: training.title }]}
          compact
        />
        <section className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <button
              onClick={() => setSelectedTraining(null)}
              className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:underline mb-8"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour aux formations
            </button>

            <div className="grid lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2">
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1.5 rounded-full text-sm bg-blue-100 text-blue-700 font-medium">{training.level}</span>
                  <span className="px-3 py-1.5 rounded-full text-sm bg-orange-100 text-orange-800 font-medium">Durée : {training.duration}</span>
                  <span className="px-3 py-1.5 rounded-full text-sm bg-slate-100 text-slate-600">{training.format}</span>
                  {training.certification && <span className="px-3 py-1.5 rounded-full text-sm bg-green-100 text-green-700 font-medium">🏅 Certification incluse</span>}
                </div>

                <p className="text-slate-700 leading-relaxed mb-8 text-lg">{training.description}</p>

                <div className="mb-8">
                  <h2 className="text-xl font-bold text-slate-900 font-display mb-4">Objectifs pédagogiques</h2>
                  <ul className="space-y-3">
                    {training.objectives.map((obj, i) => (
                      <li key={i} className="flex gap-3 text-slate-600">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">{i + 1}</span>
                        <span className="pt-0.5">{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h3 className="font-bold text-slate-900 font-display mb-2">Public cible</h3>
                  <p className="text-slate-600 text-sm">{training.audience}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-900 font-display">Informations</h3>
                  {[
                    { label: 'Durée', value: training.duration },
                    { label: 'Format', value: training.format },
                    { label: 'Public', value: training.level },
                    { label: 'Tarif', value: training.price },
                  ].map(i => (
                    <div key={i.label}>
                      <div className="text-xs text-slate-500">{i.label}</div>
                      <div className="font-semibold text-slate-900 text-sm">{i.value}</div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setSelectedTraining(null); setShowForm(true); }}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm"
                >
                  Demander un devis
                </button>
                <button
                  onClick={() => navigate('contact')}
                  className="w-full py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm"
                >
                  Nous contacter
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
        title="Cabinet CAPH-CI Conseil"
        subtitle="Expertise au service de l'inclusion — Conseil, Formation, Audit et Certification pour les entreprises et institutions."
        breadcrumbs={[{ label: 'Cabinet de Conseil' }]}
      />

      {/* Hero CTA */}
      <div className="bg-blue-600 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-blue-100 text-sm mb-1">Cabinet de conseil spécialisé</p>
            <h2 className="text-2xl font-bold font-display">Investissez dans l'inclusion. C'est rentable et humain.</h2>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setShowForm(true)} className="px-5 py-2.5 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-sm">Demander un devis</button>
            <a
              href="https://caph-ci.org/catalogue-2026.pdf"
              download
              className="px-5 py-2.5 border border-white/30 text-white rounded-lg font-medium hover:bg-white/10 transition-colors text-sm flex items-center gap-2"
              onClick={e => e.preventDefault()}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger le catalogue
            </a>
          </div>
        </div>
      </div>

      {/* Services */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-slate-900 font-display mb-2">Nos domaines d'expertise</h2>
          <p className="text-slate-500 mb-8">Le Cabinet CAPH-CI Conseil propose 8 domaines d'expertise complémentaires pour accompagner votre organisation vers l'inclusion.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {services.map(s => (
              <div key={s.title} className="p-5 rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-sm transition-all">
                <div className="text-2xl mb-3" aria-hidden="true">{s.icon}</div>
                <h3 className="font-bold text-slate-900 font-display text-sm mb-2">{s.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formations */}
      <section id="formations" className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-display">Formations disponibles</h2>
              <p className="text-slate-500 text-sm mt-1">Toutes nos formations sont disponibles en présentiel et en distanciel</p>
            </div>
            <a
              href="/catalogue-formations-2026.pdf"
              download
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-600 text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors"
              onClick={e => e.preventDefault()}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger le catalogue
            </a>
          </div>
          <div className="space-y-3">
            {trainings.map(t => (
              <div key={t.id} className="flex items-center gap-5 p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-200 transition-colors">
                <div className="text-2xl flex-shrink-0" aria-hidden="true">🎓</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 font-display text-sm">{t.title}</h3>
                  <div className="flex flex-wrap gap-3 mt-1">
                    <span className="text-xs text-slate-500">⏱ {t.duration}</span>
                    <span className="text-xs text-slate-500">👥 {t.level}</span>
                    <span className="text-xs text-slate-500">📡 {t.format}</span>
                    {t.certification && <span className="text-xs text-green-600 font-medium">🏅 Certifiant</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setSelectedTraining(t.id)}
                    className="px-4 py-2 rounded-lg text-slate-600 text-xs font-medium border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    Voir le détail
                  </button>
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 rounded-lg border border-blue-600 text-blue-600 text-xs font-medium hover:bg-blue-50 transition-colors whitespace-nowrap"
                  >
                    Demander un devis
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-display mb-6">Pourquoi choisir le Cabinet CAPH-CI Conseil ?</h2>
              <div className="space-y-4">
                {[
                  { icon: '🏆', title: 'Expertise reconnue', text: 'Plus de 10 ans d\'expérience dans l\'inclusion du handicap en Côte d\'Ivoire et en Afrique de l\'Ouest.' },
                  { icon: '🤝', title: 'Ancrage terrain', text: 'Nous connaissons la réalité des personnes handicapées ivoiriennes. Nos conseils sont concrets et applicables.' },
                  { icon: '📈', title: 'Impact mesurable', text: 'Nos interventions sont évaluées avec des indicateurs clairs. Nous rendons compte de l\'impact réel de nos recommandations.' },
                  { icon: '🌍', title: 'Double mission', text: 'En choisissant le Cabinet CAPH-CI Conseil, vous contribuez directement au financement des actions de la CAPH-CI.' },
                ].map(r => (
                  <div key={r.title} className="flex gap-3">
                    <span className="text-xl flex-shrink-0" aria-hidden="true">{r.icon}</span>
                    <div>
                      <div className="font-bold text-slate-900 text-sm font-display">{r.title}</div>
                      <p className="text-slate-500 text-sm">{r.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4" aria-hidden="true">📞</div>
              <h3 className="text-xl font-bold text-slate-900 font-display mb-3">Parlons de votre projet</h3>
              <p className="text-slate-600 text-sm mb-6">Contactez-nous pour un premier échange gratuit et confidentiel sur vos enjeux d'inclusion.</p>
              <div className="space-y-3">
                <button onClick={() => setShowForm(true)} className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">Demander un devis</button>
                <button onClick={() => navigate('contact')} className="w-full py-3 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors">Nous contacter</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catalogue download section */}
      <section className="py-14 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-5xl mb-4" aria-hidden="true">📄</div>
          <h2 className="text-2xl font-bold font-display mb-3">Catalogue de formations 2026</h2>
          <p className="text-slate-300 mb-8 max-w-xl mx-auto">
            Découvrez l'intégralité de nos formations, tarifs, modalités et témoignages clients dans notre catalogue annuel.
            Téléchargement gratuit — 20 pages.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="/catalogue-formations-2026.pdf"
              download
              className="inline-flex items-center gap-2.5 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-colors"
              onClick={e => e.preventDefault()}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger le catalogue (PDF)
            </a>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white rounded-lg font-medium hover:bg-white/10 transition-colors">
              Demander un devis personnalisé
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-4">Format PDF · 1,5 Mo · Mis à jour en janvier 2026</p>
        </div>
      </section>

      {/* Contact section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 font-display mb-3">Contactez le Cabinet</h2>
            <p className="text-slate-500">Notre équipe répond dans les 48 heures ouvrables.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            {[
              {
                icon: '📧',
                label: 'Email',
                value: 'caphci2011@gmail.com',
                href: 'mailto:caphci2011@gmail.com',
              },
              {
                icon: '📞',
                label: 'Téléphone',
                value: '07 08 24 95 30',
                href: 'tel:+2250708249530',
              },
              {
                icon: '📍',
                label: 'Adresse',
                value: 'Cocody Riviera 3, Abidjan',
                href: undefined,
              },
            ].map(c => (
              <div key={c.label} className="text-center p-6 rounded-xl border border-slate-200">
                <div className="text-3xl mb-3" aria-hidden="true">{c.icon}</div>
                <div className="text-xs text-slate-400 mb-1">{c.label}</div>
                {c.href ? (
                  <a href={c.href} className="font-semibold text-blue-600 hover:underline text-sm">{c.value}</a>
                ) : (
                  <div className="font-semibold text-slate-900 text-sm">{c.value}</div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <button onClick={() => setShowForm(true)} className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              Nous écrire — Demande de devis
            </button>
          </div>
        </div>
      </section>

      {/* Devis modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Demande de devis">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 font-display">Demander un devis</h2>
              <button onClick={() => { setShowForm(false); setSubmitted(false); reset(); mutation.reset(); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400" aria-label="Fermer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {submitted ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-4" aria-hidden="true">✅</div>
                <h3 className="text-xl font-bold text-slate-900 font-display mb-2">Demande reçue !</h3>
                <p className="text-slate-600 text-sm mb-4">Notre équipe reviendra vers vous dans les 48 heures ouvrables.</p>
                <button onClick={() => { setShowForm(false); setSubmitted(false); reset(); mutation.reset(); }} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">Fermer</button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="p-6 space-y-4">
                <ErrorSummary errors={errors} show={submitCount > 0} submitCount={submitCount} />
                {[
                  { id: 'organisation', label: 'Organisation *', type: 'text', placeholder: 'Nom de votre organisation', key: 'organisation' as const },
                  { id: 'contact', label: 'Nom & Prénom *', type: 'text', placeholder: 'Votre nom', key: 'contact' as const },
                  { id: 'email', label: 'Email *', type: 'email', placeholder: 'votre@email.com', key: 'email' as const },
                ].map(f => (
                  <div key={f.id}>
                    <label htmlFor={f.id} className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                    <input {...register(f.key)} {...a11y(errors, f.key, f.id)} type={f.type} placeholder={f.placeholder}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                    <FieldError errors={errors} name={f.key} id={f.id} />
                  </div>
                ))}
                <div>
                  <label htmlFor="service" className="block text-sm font-medium text-slate-700 mb-1">Service souhaité *</label>
                  <select {...register('service')} {...a11y(errors, 'service', 'service')} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 outline-none bg-white">
                    <option value="">Choisir un service</option>
                    {services.map(s => <option key={s.title} value={s.title}>{s.title}</option>)}
                    <optgroup label="Formations">
                      {trainings.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
                    </optgroup>
                  </select>
                  <FieldError errors={errors} name="service" id="service" />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
                  <textarea {...register('message')} {...a11y(errors, 'message', 'message')} rows={4} placeholder="Décrivez votre projet ou vos besoins..." className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
                  <FieldError errors={errors} name="message" id="message" />
                </div>
                <ApiErrorAlert message={mutation.error?.message} />
                <button type="submit" disabled={mutation.isPending} aria-busy={mutation.isPending} className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-wait">{mutation.isPending ? 'Envoi en cours…' : 'Envoyer ma demande'}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

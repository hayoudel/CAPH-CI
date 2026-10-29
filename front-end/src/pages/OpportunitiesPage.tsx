import { useState } from 'react';
import PageHero from '../components/PageHero';
import { useNavigation } from '../context/NavigationContext';
import QueryState from '../components/QueryState';
import { useOpportunities } from '../hooks/queries';
import type { Opportunity } from '../types';

const categoryColors: Record<string, string> = {
  'Emploi': 'bg-green-100 text-green-700',
  'Stage': 'bg-blue-100 text-blue-700',
  'Formation': 'bg-orange-100 text-orange-800',
  'Bourse': 'bg-amber-100 text-amber-700',
  'Appel à projets': 'bg-orange-100 text-orange-700',
  'Financement': 'bg-emerald-100 text-emerald-700',
  'Partenariat': 'bg-slate-100 text-slate-700',
};

type Props = { detail?: boolean };

function OpportunitiesPageContent({ detail, opportunities }: Props & { opportunities: Opportunity[] }) {
  const { navigate, selectedId } = useNavigation();
  const [catFilter, setCatFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showFinancingForm, setShowFinancingForm] = useState(false);
  const [financingSubmitted, setFinancingSubmitted] = useState(false);
  const [financingForm, setFinancingForm] = useState({
    nom: '',
    organisation: '',
    fonction: '',
    email: '',
    telephone: '',
    typeSoutien: '',
    montant: '',
    message: '',
  });

  const opp = opportunities.find(o => o.id === selectedId);

  const handleFinancingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFinancingSubmitted(true);
  };

  if (detail && opp) {
    const isFinancing = opp.category === 'Financement';

    return (
      <>
        <PageHero
          title={opp.title}
          subtitle={`${opp.organization} · ${opp.category}`}
          breadcrumbs={[{ label: 'Opportunités', page: 'opportunities' }, { label: opp.category }]}
          compact
        />

        {/* Manifestation d'intérêt modal */}
        {showFinancingForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Manifestation d'intérêt">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-display">Manifestation d'intérêt</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{opp.title}</p>
                </div>
                <button onClick={() => { setShowFinancingForm(false); setFinancingSubmitted(false); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 flex-shrink-0" aria-label="Fermer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {financingSubmitted ? (
                <div className="p-8 text-center">
                  <div className="text-6xl mb-4" aria-hidden="true">✅</div>
                  <h3 className="text-xl font-bold text-slate-900 font-display mb-3">Manifestation reçue !</h3>
                  <p className="text-slate-600 text-sm mb-2">Votre manifestation d'intérêt pour <strong>{opp.title}</strong> a bien été enregistrée.</p>
                  <p className="text-slate-500 text-sm mb-6">L'équipe CAPH-CI analysera votre dossier et vous contactera dans les <strong>5 jours ouvrables</strong>. Un accusé de réception vous sera envoyé par email.</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => { setShowFinancingForm(false); setFinancingSubmitted(false); }} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">Fermer</button>
                    <button onClick={() => navigate('opportunities')} className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Retour aux opportunités</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFinancingSubmit} className="p-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="fi-nom" className="block text-sm font-medium text-slate-700 mb-1">Nom & Prénom *</label>
                      <input id="fi-nom" type="text" required placeholder="Votre nom complet" value={financingForm.nom}
                        onChange={e => setFinancingForm(p => ({ ...p, nom: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label htmlFor="fi-org" className="block text-sm font-medium text-slate-700 mb-1">Organisation *</label>
                      <input id="fi-org" type="text" required placeholder="Nom de votre organisation" value={financingForm.organisation}
                        onChange={e => setFinancingForm(p => ({ ...p, organisation: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="fi-fonction" className="block text-sm font-medium text-slate-700 mb-1">Fonction / Poste *</label>
                    <input id="fi-fonction" type="text" required placeholder="Ex : Directrice exécutive, Coordinateur de projet..." value={financingForm.fonction}
                      onChange={e => setFinancingForm(p => ({ ...p, fonction: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="fi-email" className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                      <input id="fi-email" type="email" required placeholder="votre@email.com" value={financingForm.email}
                        onChange={e => setFinancingForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label htmlFor="fi-tel" className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                      <input id="fi-tel" type="tel" placeholder="+225 07 00 00 00 00" value={financingForm.telephone}
                        onChange={e => setFinancingForm(p => ({ ...p, telephone: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="fi-type" className="block text-sm font-medium text-slate-700 mb-1">Type de soutien souhaité *</label>
                    <select id="fi-type" required value={financingForm.typeSoutien}
                      onChange={e => setFinancingForm(p => ({ ...p, typeSoutien: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 outline-none bg-white">
                      <option value="">Choisir...</option>
                      {['Financement de projet', 'Subvention associative', 'Microfinancement', 'Investissement à impact', 'Partenariat financier', 'Autre'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="fi-montant" className="block text-sm font-medium text-slate-700 mb-1">Montant souhaité (FCFA) — optionnel</label>
                    <input id="fi-montant" type="text" placeholder="Ex : 5 000 000" value={financingForm.montant}
                      onChange={e => setFinancingForm(p => ({ ...p, montant: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                    <p className="text-slate-400 text-xs mt-1">Fourchettes disponibles : 2 à 25 millions FCFA</p>
                  </div>
                  <div>
                    <label htmlFor="fi-message" className="block text-sm font-medium text-slate-700 mb-1">Description de votre projet / besoin *</label>
                    <textarea id="fi-message" required rows={5} placeholder="Décrivez votre organisation, votre projet et en quoi ce financement vous aiderait..."
                      value={financingForm.message} onChange={e => setFinancingForm(p => ({ ...p, message: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
                  </div>
                  <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                    Soumettre ma manifestation d'intérêt
                  </button>
                  <p className="text-center text-xs text-slate-400">Vos données sont traitées conformément à notre politique de confidentialité.</p>
                </form>
              )}
            </div>
          </div>
        )}

        <section className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2">
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${categoryColors[opp.category] ?? 'bg-slate-100 text-slate-700'}`}>{opp.category}</span>
                  <span className="px-3 py-1.5 rounded-full text-sm bg-slate-100 text-slate-600">{opp.sector}</span>
                </div>
                <p className="text-lg text-slate-700 leading-relaxed mb-6">{opp.summary}</p>
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <p className="text-slate-600 leading-relaxed text-sm">
                    Pour postuler ou obtenir plus d'informations sur cette opportunité, veuillez contacter l'organisation concernée directement ou vous rapprocher de la CAPH-CI qui peut vous accompagner dans votre démarche.
                  </p>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    La CAPH-CI référence ces opportunités dans un esprit de service à ses membres et à toute personne handicapée en Côte d'Ivoire. Elle ne garantit pas leur disponibilité et recommande de vérifier les conditions auprès de l'organisme émetteur.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <h3 className="font-bold text-slate-900 font-display">Détails</h3>
                  {[
                    { label: 'Organisation', value: opp.organization },
                    { label: 'Catégorie', value: opp.category },
                    { label: 'Secteur', value: opp.sector },
                    { label: 'Localisation', value: opp.region },
                    { label: 'Date limite', value: opp.deadline },
                  ].map(i => (
                    <div key={i.label}>
                      <div className="text-xs text-slate-500">{i.label}</div>
                      <div className="font-semibold text-slate-900 text-sm">{i.value}</div>
                    </div>
                  ))}
                </div>
                <div className="p-5 rounded-xl bg-red-50 border border-red-200">
                  <div className="text-xs text-red-600 font-semibold mb-1">⏰ Date limite</div>
                  <div className="font-bold text-red-700">{opp.deadline}</div>
                </div>

                {/* Comment postuler / Financer ce projet */}
                {isFinancing ? (
                  <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                    <h3 className="font-bold text-slate-900 font-display text-sm">Financer ce projet</h3>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Vous êtes intéressé(e) par ce fonds de financement ? Soumettez votre manifestation d'intérêt en remplissant le formulaire. Un chargé de programme vous contactera sous 5 jours ouvrables.
                    </p>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li className="flex gap-1.5"><span className="text-emerald-600">✓</span> Réponse sous 5 jours ouvrables</li>
                      <li className="flex gap-1.5"><span className="text-emerald-600">✓</span> Accompagnement gratuit</li>
                      <li className="flex gap-1.5"><span className="text-emerald-600">✓</span> Traitement confidentiel</li>
                    </ul>
                    <button
                      onClick={() => setShowFinancingForm(true)}
                      className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      Soumettre une manifestation d'intérêt
                    </button>
                  </div>
                ) : (
                  <div className="p-5 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
                    <h3 className="font-bold text-slate-900 font-display text-sm">Comment postuler ?</h3>
                    {opp.category === 'Emploi' || opp.category === 'Stage' ? (
                      <>
                        <p className="text-slate-600 text-xs leading-relaxed">Envoyez votre CV et lettre de motivation à l'adresse suivante :</p>
                        <a href="mailto:recrutement@caph-ci.org" className="flex items-center gap-2 text-blue-600 text-xs font-semibold hover:underline break-all">
                          <span>✉️</span> recrutement@caph-ci.org
                        </a>
                        <p className="text-slate-500 text-xs">Objet du mail : <em>Candidature — {opp.title}</em></p>
                      </>
                    ) : opp.category === 'Formation' ? (
                      <>
                        <p className="text-slate-600 text-xs leading-relaxed">Inscrivez-vous en remplissant le formulaire d'inscription ou contactez :</p>
                        <a href="mailto:formation@caph-ci.org" className="flex items-center gap-2 text-blue-600 text-xs font-semibold hover:underline">
                          <span>✉️</span> formation@caph-ci.org
                        </a>
                        <a href="tel:+2250708249530" className="flex items-center gap-2 text-blue-600 text-xs font-semibold hover:underline">
                          <span>📞</span> 07 08 24 95 30
                        </a>
                      </>
                    ) : opp.category === 'Bourse' ? (
                      <>
                        <p className="text-slate-600 text-xs leading-relaxed">Déposez votre dossier de candidature complet avant la date limite :</p>
                        <a href="mailto:bourses@caph-ci.org" className="flex items-center gap-2 text-blue-600 text-xs font-semibold hover:underline">
                          <span>✉️</span> bourses@caph-ci.org
                        </a>
                        <p className="text-slate-500 text-xs">Pièces requises : relevés de notes, attestation d'inscription, certificat de handicap.</p>
                      </>
                    ) : opp.category === 'Appel à projets' ? (
                      <>
                        <p className="text-slate-600 text-xs leading-relaxed">Soumettez votre dossier de projet complet à :</p>
                        <a href="mailto:projets@caph-ci.org" className="flex items-center gap-2 text-blue-600 text-xs font-semibold hover:underline">
                          <span>✉️</span> projets@caph-ci.org
                        </a>
                        <p className="text-slate-500 text-xs">Format requis : note conceptuelle de 3 pages maximum avant la date limite.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-slate-600 text-xs leading-relaxed">Contactez l'organisation directement pour plus d'informations :</p>
                        <a href="mailto:caphci2011@gmail.com" className="flex items-center gap-2 text-blue-600 text-xs font-semibold hover:underline">
                          <span>✉️</span> caphci2011@gmail.com
                        </a>
                        <a href="tel:+2250708249530" className="flex items-center gap-2 text-blue-600 text-xs font-semibold hover:underline">
                          <span>📞</span> 07 08 24 95 30
                        </a>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  const categories = Array.from(new Set(opportunities.map(o => o.category)));
  const regions = Array.from(new Set(opportunities.map(o => o.region)));

  const filtered = opportunities.filter(o => {
    const matchCat = !catFilter || o.category === catFilter;
    const matchRegion = !regionFilter || o.region === regionFilter;
    const matchSearch = !search || o.title.toLowerCase().includes(search.toLowerCase()) || o.organization.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchRegion && matchSearch;
  });

  return (
    <>
      <PageHero
        title="Opportunités"
        subtitle="Emplois, stages, formations, bourses, appels à projets et financements pour et par les personnes handicapées."
        breadcrumbs={[{ label: 'Opportunités' }]}
      />

      {/* Filters */}
      <div className="py-6 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-52">
              <input
                type="search"
                placeholder="Rechercher une opportunité..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
              />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:border-blue-500 outline-none">
              <option value="">Toutes les catégories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:border-blue-500 outline-none">
              <option value="">Toutes les régions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {(catFilter || regionFilter || search) && (
              <button onClick={() => { setCatFilter(''); setRegionFilter(''); setSearch(''); }} className="px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-white transition-colors">Réinitialiser</button>
            )}
          </div>
        </div>
      </div>

      {/* Category quick filters */}
      <div className="py-4 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            <button onClick={() => setCatFilter('')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${!catFilter ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Toutes</button>
            {categories.map(c => (
              <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${catFilter === c ? 'bg-blue-600 text-white' : `${categoryColors[c] ?? 'bg-slate-100 text-slate-600'} hover:opacity-80`}`}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-slate-500 text-sm mb-6">{filtered.length} opportunité{filtered.length > 1 ? 's' : ''} disponible{filtered.length > 1 ? 's' : ''}</p>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-5xl mb-4">💡</div>
              <p>Aucune opportunité ne correspond à votre recherche.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(o => (
                <button
                  key={o.id}
                  onClick={() => navigate('opportunity-detail', o.id)}
                  className="group w-full text-left p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${categoryColors[o.category] ?? 'bg-slate-100 text-slate-700'}`}>{o.category}</span>
                        <span className="text-xs text-slate-400">{o.sector}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <span aria-hidden="true">📍</span>{o.region}
                        </span>
                        {o.category === 'Financement' && (
                          <span className="px-2 py-0.5 rounded text-xs bg-emerald-600 text-white font-medium">Financement disponible</span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 font-display mb-1 line-clamp-1">{o.title}</h3>
                      <div className="text-slate-500 text-sm font-medium mb-2">{o.organization}</div>
                      <p className="text-slate-500 text-sm line-clamp-2">{o.summary}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Date limite</div>
                        <div className="font-semibold text-slate-900 text-sm">{o.deadline}</div>
                      </div>
                      <span className="text-blue-600 text-xs font-semibold group-hover:underline whitespace-nowrap">Voir l'opportunité →</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function OpportunitiesPage(props: Omit<Parameters<typeof OpportunitiesPageContent>[0], 'opportunities'>) {
  const q_opportunities = useOpportunities();
  return (
    <QueryState queries={[q_opportunities]}>
      {() => <OpportunitiesPageContent {...props} opportunities={q_opportunities.data!} />}
    </QueryState>
  );
}

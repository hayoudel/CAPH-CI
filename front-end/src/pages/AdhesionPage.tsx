import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import PageHero from '../components/PageHero';
import { api } from '../api';
import { membershipSchema } from '../schemas/forms';
import { useZodForm } from '../components/forms/useZodForm';
import { a11y, ApiErrorAlert, ErrorSummary, FieldError } from '../components/forms/FormKit';
import { useNavigation } from '../context/NavigationContext';

// ─────────────────────────────────────────────
// Step 1 — Conditions d'adhésion
// ─────────────────────────────────────────────

const eligibilityItems = [
  { icon: '👤', title: 'Personne physique', detail: 'Personne handicapée, parent, tuteur ou représentant, ou personne admise pour son engagement reconnu en faveur des droits des personnes handicapées.' },
  { icon: '🏛️', title: 'Personne morale', detail: 'Association de ou pour personnes handicapées, ou structure non lucrative régulièrement constituée intervenant dans le champ du handicap.' },
  { icon: '🤝', title: 'Membre honoraire', detail: 'Personne physique ou morale apportant un soutien désintéressé. La désignation relève de l’Assemblée Générale sur proposition du Conseil d’Administration.' },
  { icon: '👪', title: 'Demande concernant un mineur', detail: 'Une autorisation parentale doit obligatoirement accompagner la demande.' },
];

const criteriaItems = [
  { icon: '✅', title: 'Demande signée', detail: 'Le bulletin d’adhésion doit être complété et signé par le demandeur ou le représentant habilité.' },
  { icon: '📘', title: 'Acceptation des textes', detail: 'L’adhésion implique l’acceptation des statuts, du règlement intérieur et des politiques institutionnelles applicables.' },
  { icon: '📋', title: 'Instruction et enregistrement', detail: 'L’admission est examinée par les instances compétentes, puis inscrite au fichier national après décision et règlement des droits applicables.' },
];

const rightsItems = [
  'Accès aux prestations selon les règles applicables',
  'Participation aux activités et droit à l’information',
  'Qualité d’électeur et éligibilité pour les membres actifs à jour, sous réserve des conditions électorales',
  'Information générale et participation aux Assemblées Générales avec voix consultative pour les membres honoraires',
  'L’adhésion ne garantit pas automatiquement une aide ou une prestation',
];

const obligationsItems = [
  'Respecter les statuts, le règlement intérieur, les politiques de sauvegarde et les décisions des organes',
  'Payer les cotisations dues et participer à la vie associative',
  'Agir avec loyauté, réserve et probité',
  'Déclarer les conflits d’intérêts',
  'Respecter les valeurs et politiques de la CAPH-CI, y compris pour les membres honoraires',
];

const procedureSteps = [
  { num: '1', title: 'Compléter le bulletin', desc: 'Remplir et signer le bulletin d’adhésion.' },
  { num: '2', title: 'Joindre les justificatifs', desc: 'Ajouter les pièces adaptées à la catégorie du demandeur.' },
  { num: '3', title: 'Déposer le dossier', desc: 'Au Secrétariat Permanent ou auprès de la délégation compétente.' },
  { num: '4', title: 'Examen', desc: 'Le Conseil d’Administration statue sur l’admission.' },
  { num: '5', title: 'Règlement', desc: 'Régler les droits applicables après acceptation et recevoir un justificatif.' },
  { num: '6', title: 'Enregistrement', desc: 'Inscription au fichier national et rattachement territorial.' },
  { num: '7', title: 'Carte de membre', desc: 'Délivrance de la carte après enregistrement effectif.' },
];

const docsRequired = [
  'Personne physique : bulletin signé et copie d’une pièce d’identité recommandée',
  'Personne physique mineure : autorisation parentale',
  'Justificatif de représentation ou de tutelle lorsque pertinent',
  'Personne morale : bulletin signé',
  'Personne morale : récépissé ou document de régularité juridique',
  'Personne morale : statuts ou document équivalent',
  'Identité et habilitation du représentant de la personne morale',
];

// ─────────────────────────────────────────────
// Step 2 — Formulaire
// ─────────────────────────────────────────────

const orgTypes = [
  'Association de personnes handicapées', 'Fédération d\'associations', 'Groupement de femmes handicapées',
  'Organisation de jeunes handicapés', 'Centre de réhabilitation associatif', 'Réseau thématique', 'Autre',
];

const domains = [
  'Handicap visuel', 'Handicap auditif', 'Handicap moteur / physique', 'Handicap mental / psychosocial',
  'Handicap intellectuel', 'Polyhandicap', 'Transversal / Toutes déficiences', 'Autre',
];

const regions = [
  'Abidjan', 'Lagunes', 'Bas-Sassandra', 'Comoé', 'Montagnes', 'Bafing', 'Sassandra-Marahoué',
  'Vallée du Bandama', 'Woroba', 'Marahoué', 'Gôh-Djiboua', 'Lacs', 'Zanzan', 'Hambol',
  'N\'zi', 'Gbêkê', 'Poro', 'Tchologo', 'Bagoué', 'Folon', 'Kabadougou',
];

type AdhesionStep = 'conditions' | 'form' | 'confirm';
type Props = { initialStep?: AdhesionStep };

export default function AdhesionPage({ initialStep }: Props) {
  const { navigate } = useNavigation();
  const [step, setStep] = useState<AdhesionStep>(initialStep ?? 'conditions');
  const [refNumber] = useState(() => `CAPH-ADH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const formRef = useRef<HTMLDivElement>(null);

  // L'étape suit l'URL (/adherer, /adherer/demande, /adherer/confirmation).
  useEffect(() => { setStep(initialStep ?? 'conditions'); }, [initialStep]);
  const goToForm = () => navigate('adhesion-form');
  const goToConditions = () => navigate('adhesion');

  // ── STEP 3: Confirmation ─────────────────────
  if (step === 'confirm') {
    return (
      <>
        <PageHero
          title="Simulation de demande terminée"
          breadcrumbs={[{ label: 'Adhésion', page: 'adhesion' }, { label: 'Confirmation' }]}
          compact
        />
        <section className="py-16 bg-white">
          <div className="max-w-2xl mx-auto px-4">
            {/* Success banner */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center mb-10">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 font-display mb-3">Votre formulaire est prêt à être transmis</h2>
              <p className="text-slate-600 mb-4">
                Cette maquette n’envoie ni ne conserve aucune donnée. Dans le parcours réel, le dossier sera examiné par les instances compétentes et l’admission relèvera du Conseil d’Administration.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-green-200 text-sm font-mono text-green-700 font-semibold">
                <span aria-hidden="true">🔖</span>
                Référence : {refNumber}
              </div>
              <p className="text-slate-400 text-xs mt-2">Conservez ce numéro de référence pour le suivi de votre demande.</p>
            </div>

            {/* Next steps */}
            <div className="mb-10">
              <h3 className="text-lg font-bold text-slate-900 font-display mb-5">Prochaines étapes</h3>
              <div className="space-y-3">
                {[
                  { num: '1', label: 'Dossier préparé', desc: 'Le formulaire de démonstration a été complété.', done: true },
                  { num: '2', label: 'Vérification', desc: 'Le Secrétariat Permanent vérifie la complétude du dossier.', done: false },
                  { num: '3', label: 'Complément éventuel', desc: 'Si des documents manquent, vous serez contacté(e) par email ou téléphone.', done: false },
                  { num: '4', label: 'Décision', desc: 'La demande d’admission est examinée par le Conseil d’Administration.', done: false },
                  { num: '5', label: 'Décision communiquée', desc: 'Vous recevrez une notification officielle par email et courrier.', done: false },
                ].map((s, i) => (
                  <div key={i} className={`flex gap-4 p-4 rounded-xl border transition-colors ${s.done ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${s.done ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {s.done ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : s.num}
                    </div>
                    <div>
                      <div className={`font-semibold text-sm font-display ${s.done ? 'text-blue-700' : 'text-slate-900'}`}>{s.label}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 text-sm text-slate-600">
              <strong className="block mb-1 font-display text-slate-900">À noter</strong>
              Aucun délai de traitement n’est indiqué dans le document de référence.
              Pour toute question, contactez le Secrétariat Permanent : <a href="mailto:caphci2011@gmail.com" className="text-blue-600 hover:underline font-medium">caphci2011@gmail.com</a>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button onClick={() => navigate('home')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm">
                Retour à l'accueil
              </button>
              <button onClick={() => navigate('contact')} className="px-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm">
                Nous contacter
              </button>
            </div>
          </div>
        </section>
      </>
    );
  }

  // ── STEP 2: Formulaire ───────────────────────
  if (step === 'form') {
    return <AdhesionForm onBack={goToConditions} onSubmit={() => navigate('adhesion-confirm')} />;
  }

  // ── STEP 1: Conditions ───────────────────────
  return (
    <>
      <PageHero
        title="Devenir membre de la CAPH-CI"
        subtitle="Bulletin d’adhésion et d’engagement pour les personnes physiques, personnes morales et membres honoraires."
        breadcrumbs={[{ label: 'Adhésion' }]}
      />

      {/* Progress indicator */}
      <div className="bg-white border-b border-slate-200 py-4">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3">
            {[
              { n: 1, label: 'Conditions d\'adhésion', active: true },
              { n: 2, label: 'Formulaire de demande', active: false },
              { n: 3, label: 'Confirmation', active: false },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${s.active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{s.n}</div>
                  <span className={`text-sm hidden sm:block ${s.active ? 'font-semibold text-blue-600' : 'text-slate-400'}`}>{s.label}</span>
                </div>
                {i < 2 && <div className="w-8 h-px bg-slate-200 flex-shrink-0" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Intro */}
      <section className="py-10 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-blue-100 text-sm mb-1 font-medium">Personnes physiques · Personnes morales · Membres honoraires</p>
              <h2 className="text-2xl font-bold font-display mb-3">Pourquoi rejoindre la CAPH-CI ?</h2>
              <p className="text-blue-100 leading-relaxed text-sm">
                L’adhésion permet de participer à la vie associative selon la catégorie du membre. Elle ne garantit pas automatiquement une aide ou une prestation.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2 text-blue-100"><span>📋</span> 37 organisations affiliées</div>
              <div className="flex items-center gap-2 text-blue-100"><span>🌍</span> 45 délégations régionales et communales</div>
              <div className="flex items-center gap-2 text-blue-100"><span>🤝</span> Réseau actif depuis 2011</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="max-w-4xl mx-auto px-4 space-y-14">

          {/* Éligibilité */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display mb-2">Conditions d'éligibilité</h2>
            <p className="text-slate-500 text-sm mb-6">Le bulletin adopté en 2026 distingue les catégories de demandeurs suivantes.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {eligibilityItems.map(item => (
                <div key={item.title} className="p-5 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors">
                  <div className="text-2xl mb-3" aria-hidden="true">{item.icon}</div>
                  <h3 className="font-bold text-slate-900 font-display text-sm mb-1.5">{item.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Critères */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display mb-2">Critères d'adhésion</h2>
            <p className="text-slate-500 text-sm mb-6">L’admission suppose une demande formelle, l’acceptation des textes applicables et une décision des instances compétentes.</p>
            <div className="space-y-3">
              {criteriaItems.map(item => (
                <div key={item.title} className="flex gap-4 p-5 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors">
                  <div className="text-xl flex-shrink-0" aria-hidden="true">{item.icon}</div>
                  <div>
                    <h3 className="font-bold text-slate-900 font-display text-sm mb-1">{item.title}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Droits et Obligations côte à côte */}
          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-display mb-4">Droits des membres</h2>
              <ul className="space-y-2">
                {rightsItems.map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-slate-600 text-sm">
                    <span className="text-blue-600 flex-shrink-0 font-bold">✓</span>{r}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-display mb-4">Obligations des membres</h2>
              <ul className="space-y-2">
                {obligationsItems.map((o, i) => (
                  <li key={i} className="flex gap-2.5 text-slate-600 text-sm">
                    <span className="text-slate-400 flex-shrink-0">•</span>{o}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Cotisations */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <span className="text-2xl flex-shrink-0" aria-hidden="true">💰</span>
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display mb-2">Frais et cotisations</h2>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-slate-700">
                  {[
                    ['Adhésion personne physique', '10 000 FCFA'],
                    ['Adhésion personne morale', '25 000 FCFA'],
                    ['Carte annuelle', '2 000 FCFA'],
                    ['Cotisation sans emploi', '1 000 FCFA / mois'],
                    ['Cotisation activité libérale', '1 500 FCFA / mois'],
                    ['Administration publique ou assimilée', '3 000 FCFA / mois'],
                    ['CA ou Conseil de Surveillance', '3 000 FCFA / mois'],
                    ['Association ou organisation affiliée', '5 000 FCFA / mois'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 border-b border-amber-200 py-2">
                      <span>{label}</span><strong className="text-right">{value}</strong>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-600 mt-4">Barème transitoire du RI 2026, sous réserve d’une nouvelle délibération de l’Assemblée Générale. Les cotisations sont dues à partir de l’enregistrement effectif et un paiement échelonné est possible.</p>
              </div>
            </div>
          </div>

          {/* Procédure */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display mb-6">Procédure d'admission</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {procedureSteps.map((s) => (
                <div key={s.num} className="text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg mx-auto mb-3 font-display">{s.num}</div>
                  <h3 className="font-bold text-slate-900 text-sm font-display mb-1">{s.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Documents requis */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display mb-4">Documents à fournir</h2>
            <p className="text-slate-500 text-sm mb-5">
              Les pièces varient selon la catégorie du demandeur, conformément au bulletin d’adhésion 2026 :
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {docsRequired.map((d, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5" aria-hidden="true">
                    <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-slate-700 text-sm">{d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
            <h3 className="text-xl font-bold text-slate-900 font-display mb-3">Prêt à rejoindre la CAPH-CI ?</h3>
            <p className="text-slate-600 text-sm mb-6 max-w-md mx-auto">
              Téléchargez les conditions complètes pour les partager avec votre bureau, puis soumettez votre demande en ligne.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href="/conditions-adhesion-caph-ci.pdf"
                download
                onClick={e => e.preventDefault()}
                className="inline-flex items-center gap-2 px-6 py-3 border border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-100 transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Télécharger les conditions d'adhésion
              </a>
              <button onClick={goToForm} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm">
                Faire une demande d'adhésion
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ─────────────────────────────────────────────
// Formulaire component (Step 2)
// ─────────────────────────────────────────────

function AdhesionForm({ onBack, onSubmit }: { onBack: () => void; onSubmit: () => void }) {
  const { register, handleSubmit, watch, formState: { errors, submitCount } } = useZodForm(membershipSchema, {
    natureDemande: 'premiere', categorie: '', profilPhysique: '', nomPersonne: '', naissance: '', profession: '', typeHandicap: '', amenagement: '', delegation: '', contribution: '',
    nomOrg: '', sigle: '', dateCreation: '', typeOrg: '', domaine: '', region: '', zone: '', recepisse: '', secretaire: '', tresorier: '',
    commune: '', adresse: '', responsableNom: '', fonction: '', telephone: '', email: '',
    presentation: '', mission: '', nbMembres: '', motivations: '', agreed: false,
  });
  const form = watch();
  const mutation = useMutation({ mutationFn: api.submitMembership, onSuccess: () => onSubmit() });
  const submit = handleSubmit(values => mutation.mutateAsync(values).catch(() => undefined));

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <>
      <PageHero
        title="Formulaire de demande d'adhésion"
        subtitle="à la CAPH-CI — Coordination des Associations de Personnes Handicapées de Côte d'Ivoire"
        breadcrumbs={[{ label: 'Adhésion', page: 'adhesion' }, { label: 'Formulaire' }]}
        compact
      />

      {/* Progress indicator */}
      <div className="bg-white border-b border-slate-200 py-4">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3">
            {[
              { n: 1, label: 'Conditions d\'adhésion', active: false, done: true },
              { n: 2, label: 'Formulaire de demande', active: true, done: false },
              { n: 3, label: 'Confirmation', active: false, done: false },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${s.active ? 'bg-blue-600 text-white' : s.done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {s.done ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : s.n}
                  </div>
                  <span className={`text-sm hidden sm:block ${s.active ? 'font-semibold text-blue-600' : s.done ? 'text-green-600' : 'text-slate-400'}`}>{s.label}</span>
                </div>
                {i < 2 && <div className="w-8 h-px bg-slate-200 flex-shrink-0" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="py-12 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4">
          <button onClick={onBack} className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:underline mb-8">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour aux conditions d'adhésion
          </button>

          <form onSubmit={submit} noValidate className="space-y-8">
            <ErrorSummary errors={errors} show={submitCount > 0} submitCount={submitCount} />

            <fieldset className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
              <legend className="text-lg font-bold text-slate-900 font-display px-1">Catégorie de demande</legend>
              <div className="mt-5 grid sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="natureDemande" className={labelCls}>Nature de la demande *</label>
                  <select {...register('natureDemande')} {...a11y(errors, 'natureDemande', 'natureDemande')}  className={inputCls}>
                    <option value="premiere">Première adhésion</option>
                    <option value="renouvellement">Renouvellement</option>
                  </select>
                  <FieldError errors={errors} name="natureDemande" id="natureDemande" />
                </div>
                <div>
                <label htmlFor="categorie" className={labelCls}>Vous présentez une demande en tant que *</label>
                <select {...register('categorie')} {...a11y(errors, 'categorie', 'categorie')}  className={inputCls}>
                  <option value="">Choisir une catégorie…</option>
                  <option value="physique">Personne physique</option>
                  <option value="morale">Personne morale — association ou organisme non lucratif</option>
                  <option value="honoraire">Candidature au titre de membre honoraire</option>
                </select>
                  <FieldError errors={errors} name="categorie" id="categorie" />
                </div>
              </div>
            </fieldset>

            {/* A. Organisation */}
            {form.categorie === 'morale' && (
            <fieldset className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
              <legend className="text-lg font-bold text-slate-900 font-display flex items-center gap-2 px-1">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-bold" aria-hidden="true">A</span>
                Informations sur l'organisation
              </legend>
              <div className="mt-5 grid sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label htmlFor="nomOrg" className={labelCls}>Nom de l'organisation *</label>
                  <input {...register('nomOrg')} {...a11y(errors, 'nomOrg', 'nomOrg')} type="text" placeholder="Dénomination officielle complète"  className={inputCls} />
                  <FieldError errors={errors} name="nomOrg" id="nomOrg" />
                </div>
                <div>
                  <label htmlFor="sigle" className={labelCls}>Sigle / Acronyme</label>
                  <input {...register('sigle')} {...a11y(errors, 'sigle', 'sigle')} type="text" placeholder="Ex : AIDV"  className={inputCls} />
                  <FieldError errors={errors} name="sigle" id="sigle" />
                </div>
                <div>
                  <label htmlFor="dateCreation" className={labelCls}>Date de création *</label>
                  <input {...register('dateCreation')} {...a11y(errors, 'dateCreation', 'dateCreation')} type="date"  className={inputCls} />
                  <FieldError errors={errors} name="dateCreation" id="dateCreation" />
                </div>
                <div>
                  <label htmlFor="typeOrg" className={labelCls}>Type d'organisation *</label>
                  <select {...register('typeOrg')} {...a11y(errors, 'typeOrg', 'typeOrg')}  className={inputCls}>
                    <option value="">Choisir...</option>
                    {orgTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <FieldError errors={errors} name="typeOrg" id="typeOrg" />
                </div>
                <div>
                  <label htmlFor="domaine" className={labelCls}>Domaine d'intervention *</label>
                  <select {...register('domaine')} {...a11y(errors, 'domaine', 'domaine')}  className={inputCls}>
                    <option value="">Choisir...</option>
                    {domains.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <FieldError errors={errors} name="domaine" id="domaine" />
                </div>
                <div>
                  <label htmlFor="zone" className={labelCls}>Zone d’intervention *</label>
                  <input {...register('zone')} {...a11y(errors, 'zone', 'zone')}  className={inputCls} />
                  <FieldError errors={errors} name="zone" id="zone" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="recepisse" className={labelCls}>N° de récépissé ou référence légale *</label>
                  <input {...register('recepisse')} {...a11y(errors, 'recepisse', 'recepisse')}  className={inputCls} />
                  <FieldError errors={errors} name="recepisse" id="recepisse" />
                </div>
                <div>
                  <label htmlFor="region" className={labelCls}>Région *</label>
                  <select {...register('region')} {...a11y(errors, 'region', 'region')}  className={inputCls}>
                    <option value="">Choisir...</option>
                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <FieldError errors={errors} name="region" id="region" />
                </div>
                <div>
                  <label htmlFor="commune" className={labelCls}>Commune</label>
                  <input {...register('commune')} {...a11y(errors, 'commune', 'commune')} type="text" placeholder="Commune du siège"  className={inputCls} />
                  <FieldError errors={errors} name="commune" id="commune" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="adresse" className={labelCls}>Adresse du siège *</label>
                  <input {...register('adresse')} {...a11y(errors, 'adresse', 'adresse')} type="text" placeholder="Adresse complète"  className={inputCls} />
                  <FieldError errors={errors} name="adresse" id="adresse" />
                </div>
              </div>
            </fieldset>
            )}

            {/* B. Responsable */}
            {form.categorie === 'morale' && (
            <fieldset className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
              <legend className="text-lg font-bold text-slate-900 font-display flex items-center gap-2 px-1">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-bold" aria-hidden="true">B</span>
                Informations sur le responsable
              </legend>
              <div className="mt-5 grid sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label htmlFor="responsableNom" className={labelCls}>Nom et prénom du responsable *</label>
                  <input {...register('responsableNom')} {...a11y(errors, 'responsableNom', 'responsableNom')} type="text" placeholder="Nom complet"  className={inputCls} />
                  <FieldError errors={errors} name="responsableNom" id="responsableNom" />
                </div>
                <div>
                  <label htmlFor="fonction" className={labelCls}>Fonction dans l'organisation *</label>
                  <input {...register('fonction')} {...a11y(errors, 'fonction', 'fonction')} type="text" placeholder="Ex : Président(e), Directeur(trice) exécutif(ve)"  className={inputCls} />
                  <FieldError errors={errors} name="fonction" id="fonction" />
                </div>
                <div>
                  <label htmlFor="telephone" className={labelCls}>Numéro de téléphone *</label>
                  <input {...register('telephone')} {...a11y(errors, 'telephone', 'telephone')} type="tel" placeholder="+225 07 00 00 00 00"  className={inputCls} />
                  <FieldError errors={errors} name="telephone" id="telephone" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="email" className={labelCls}>Adresse email *</label>
                  <input {...register('email')} {...a11y(errors, 'email', 'email')} type="email" placeholder="contact@organisation.ci"  className={inputCls} />
                  <FieldError errors={errors} name="email" id="email" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="secretaire" className={labelCls}>Secrétaire général — nom et contact</label>
                  <input {...register('secretaire')} {...a11y(errors, 'secretaire', 'secretaire')}  className={inputCls} />
                  <FieldError errors={errors} name="secretaire" id="secretaire" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="tresorier" className={labelCls}>Trésorier ou responsable financier — nom et contact</label>
                  <input {...register('tresorier')} {...a11y(errors, 'tresorier', 'tresorier')}  className={inputCls} />
                  <FieldError errors={errors} name="tresorier" id="tresorier" />
                </div>
              </div>
            </fieldset>
            )}

            {/* C. Informations complémentaires */}
            {form.categorie === 'morale' && (
            <fieldset className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
              <legend className="text-lg font-bold text-slate-900 font-display flex items-center gap-2 px-1">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-bold" aria-hidden="true">C</span>
                Informations complémentaires
              </legend>
              <div className="mt-5 space-y-5">
                <div>
                  <label htmlFor="presentation" className={labelCls}>Présentation de l'organisation *</label>
                  <textarea {...register('presentation')} {...a11y(errors, 'presentation', 'presentation')} rows={4} placeholder="Historique, contexte de création, zones d'intervention, projets phares..."  className={`${inputCls} resize-none`} />
                  <FieldError errors={errors} name="presentation" id="presentation" />
                </div>
                <div>
                  <label htmlFor="mission" className={labelCls}>Mission de l'organisation *</label>
                  <textarea {...register('mission')} {...a11y(errors, 'mission', 'mission')} rows={3} placeholder="Énoncé de la mission officielle de votre organisation..."  className={`${inputCls} resize-none`} />
                  <FieldError errors={errors} name="mission" id="mission" />
                </div>
                <div>
                  <label htmlFor="nbMembres" className={labelCls}>Nombre de membres (si disponible)</label>
                  <input {...register('nbMembres')} {...a11y(errors, 'nbMembres', 'nbMembres')} type="text" placeholder="Ex : 350 membres individuels"  className={inputCls} />
                  <FieldError errors={errors} name="nbMembres" id="nbMembres" />
                </div>
                <div>
                  <label htmlFor="motivations" className={labelCls}>Motivations pour rejoindre la CAPH-CI *</label>
                  <textarea {...register('motivations')} {...a11y(errors, 'motivations', 'motivations')} rows={4} placeholder="Expliquez pourquoi votre organisation souhaite rejoindre le réseau de la CAPH-CI et ce qu'elle espère apporter..."  className={`${inputCls} resize-none`} />
                  <FieldError errors={errors} name="motivations" id="motivations" />
                </div>
              </div>
            </fieldset>
            )}

            {(form.categorie === 'physique' || form.categorie === 'honoraire') && (
              <fieldset className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
                <legend className="text-lg font-bold text-slate-900 font-display px-1">
                  {form.categorie === 'honoraire' ? 'Identification du soutien' : 'Identification de la personne physique'}
                </legend>
                <div className="mt-5 grid sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label htmlFor="nomPersonne" className={labelCls}>Nom et prénoms *</label>
                    <input {...register('nomPersonne')} {...a11y(errors, 'nomPersonne', 'nomPersonne')}  className={inputCls} />
                  <FieldError errors={errors} name="nomPersonne" id="nomPersonne" />
                  </div>
                  {form.categorie === 'physique' && (
                    <>
                      <div className="sm:col-span-2">
                        <label htmlFor="profilPhysique" className={labelCls}>Profil du demandeur *</label>
                        <select {...register('profilPhysique')} {...a11y(errors, 'profilPhysique', 'profilPhysique')}  className={inputCls}>
                          <option value="">Choisir…</option>
                          <option value="personne-handicapee">Personne handicapée</option>
                          <option value="parent-tuteur">Parent, tuteur ou représentant</option>
                          <option value="engagement-reconnu">Personne dont l’engagement en faveur des droits est reconnu</option>
                        </select>
                  <FieldError errors={errors} name="profilPhysique" id="profilPhysique" />
                      </div>
                      <div>
                        <label htmlFor="naissance" className={labelCls}>Date et lieu de naissance</label>
                        <input {...register('naissance')} {...a11y(errors, 'naissance', 'naissance')}  className={inputCls} />
                  <FieldError errors={errors} name="naissance" id="naissance" />
                      </div>
                      <div>
                        <label htmlFor="profession" className={labelCls}>Profession ou qualification</label>
                        <input {...register('profession')} {...a11y(errors, 'profession', 'profession')}  className={inputCls} />
                  <FieldError errors={errors} name="profession" id="profession" />
                      </div>
                      <div>
                        <label htmlFor="typeHandicap" className={labelCls}>Type de handicap, si pertinent</label>
                        <input {...register('typeHandicap')} {...a11y(errors, 'typeHandicap', 'typeHandicap')}  className={inputCls} />
                  <FieldError errors={errors} name="typeHandicap" id="typeHandicap" />
                      </div>
                      <div>
                        <label htmlFor="amenagement" className={labelCls}>Besoin d’aménagement raisonnable</label>
                        <input {...register('amenagement')} {...a11y(errors, 'amenagement', 'amenagement')}  className={inputCls} />
                  <FieldError errors={errors} name="amenagement" id="amenagement" />
                      </div>
                    </>
                  )}
                  <div>
                    <label htmlFor="telephone" className={labelCls}>Téléphone *</label>
                    <input {...register('telephone')} {...a11y(errors, 'telephone', 'telephone')} type="tel"  className={inputCls} />
                  <FieldError errors={errors} name="telephone" id="telephone" />
                  </div>
                  <div>
                    <label htmlFor="email" className={labelCls}>Email</label>
                    <input {...register('email')} {...a11y(errors, 'email', 'email')} type="email"  className={inputCls} />
                  <FieldError errors={errors} name="email" id="email" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="adresse" className={labelCls}>Adresse complète *</label>
                    <input {...register('adresse')} {...a11y(errors, 'adresse', 'adresse')}  className={inputCls} />
                  <FieldError errors={errors} name="adresse" id="adresse" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="delegation" className={labelCls}>Délégation territoriale sollicitée</label>
                    <input {...register('delegation')} {...a11y(errors, 'delegation', 'delegation')}  className={inputCls} />
                  <FieldError errors={errors} name="delegation" id="delegation" />
                  </div>
                  {form.categorie === 'honoraire' && (
                    <div className="sm:col-span-2">
                      <label htmlFor="contribution" className={labelCls}>Présentation de la contribution désintéressée</label>
                      <textarea {...register('contribution')} {...a11y(errors, 'contribution', 'contribution')} rows={4}  className={`${inputCls} resize-none`} />
                  <FieldError errors={errors} name="contribution" id="contribution" />
                    </div>
                  )}
                </div>
              </fieldset>
            )}

            {/* D. Documents */}
            <fieldset className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
              <legend className="text-lg font-bold text-slate-900 font-display flex items-center gap-2 px-1">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-bold" aria-hidden="true">D</span>
                Documents à fournir
              </legend>
              <div className="mt-5">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-700">
                  <strong>Confidentialité :</strong> les données sensibles, notamment celles relatives au handicap et aux aménagements, doivent être traitées uniquement pour l’instruction du dossier.
                </div>
                <div className="space-y-4">
                  {(form.categorie === 'morale'
                    ? [
                        { id: 'doc-fiche', label: 'Bulletin signé' },
                        { id: 'doc-recepisse', label: 'Récépissé ou document de régularité juridique' },
                        { id: 'doc-statuts', label: 'Statuts ou document équivalent' },
                        { id: 'doc-identite', label: 'Identité du représentant' },
                        { id: 'doc-habilitation', label: 'Habilitation à représenter la structure — recommandée' },
                      ]
                    : form.categorie === 'physique'
                      ? [
                          { id: 'doc-fiche', label: 'Bulletin signé' },
                          { id: 'doc-identite', label: 'Pièce d’identité — recommandée' },
                          { id: 'doc-parent', label: 'Autorisation parentale si le demandeur est mineur' },
                          { id: 'doc-representation', label: 'Justificatif de représentation ou de tutelle si pertinent' },
                        ]
                      : [
                          { id: 'doc-identite', label: 'Identification et coordonnées du soutien' },
                          { id: 'doc-contribution', label: 'Présentation de la contribution désintéressée — recommandée' },
                        ]).map(doc => (
                    <div key={doc.id}>
                      <label htmlFor={doc.id} className={labelCls}>{doc.label}</label>
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-slate-300 hover:border-blue-400 transition-colors cursor-pointer bg-slate-50">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span className="text-slate-500 text-sm">Cliquer pour sélectionner un fichier (PDF, JPG — max 5 Mo)</span>
                        <input id={doc.id} type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </fieldset>

            {/* E. Engagement */}
            <fieldset className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
              <legend className="text-lg font-bold text-slate-900 font-display flex items-center gap-2 px-1">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-bold" aria-hidden="true">E</span>
                Engagement et déclaration
              </legend>
              <div className="mt-5">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    {...register('agreed')}
                    {...a11y(errors, 'agreed', 'agreed')}
                    type="checkbox"
                    className="mt-0.5 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <span className="text-slate-700 text-sm leading-relaxed group-hover:text-slate-900 transition-colors">
                    Je confirme l'exactitude des informations fournies et déclare avoir pris connaissance des conditions d'adhésion à la CAPH-CI et m'engage à les respecter.{' '}
                    <button type="button" onClick={onBack} className="text-blue-600 hover:underline font-medium">Lire les conditions →</button>
                  </span>
                </label>
                <FieldError errors={errors} name="agreed" id="agreed" />
              </div>
            </fieldset>

            <ApiErrorAlert message={mutation.error?.message} />

            {/* Submit */}
            <div className="flex flex-wrap gap-4 justify-between items-center pt-2">
              <button type="button" onClick={onBack} className="flex items-center gap-2 px-5 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Retour aux conditions
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                aria-busy={mutation.isPending}
                className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? 'Envoi en cours…' : 'Soumettre ma demande d\'adhésion →'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}

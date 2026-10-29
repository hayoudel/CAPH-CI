import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import PageHero from '../components/PageHero';
import { api } from '../api';
import { donationSchema } from '../schemas/forms';
import { useZodForm } from '../components/forms/useZodForm';
import { a11y, ApiErrorAlert, ErrorSummary, FieldError } from '../components/forms/FormKit';
import { useNavigation } from '../context/NavigationContext';

type DonationType = 'ponctuel' | 'regulier' | 'projet' | 'nature';
type DonationTarget = 'general' | 'projet' | 'nature';
type PaymentMethod = 'mobile-money' | 'carte' | 'virement' | 'international';

const targets = [
  { id: 'general' as DonationTarget, label: 'Actions générales', description: 'Soutien aux priorités et aux actions de la CAPH-CI', icon: '🏛️' },
  { id: 'projet' as DonationTarget, label: 'Projet choisi', description: 'Contribution affectée à une initiative précise', icon: '📋' },
  { id: 'nature' as DonationTarget, label: 'Don en nature', description: 'Matériel, équipements, vivres ou services', icon: '🎁' },
];

const supportForms: { id: DonationType; label: string; description: string; target: DonationTarget }[] = [
  { id: 'ponctuel', label: 'Don ponctuel', description: 'Une contribution financière libre, effectuée une seule fois.', target: 'general' },
  { id: 'regulier', label: 'Don régulier', description: 'Un soutien mensuel, trimestriel ou annuel pour accompagner les actions dans la durée.', target: 'general' },
  { id: 'projet', label: 'Don par projet', description: 'Une contribution affectée à une initiative précise et à ses objectifs.', target: 'projet' },
  { id: 'nature', label: 'Don en nature', description: 'Du matériel, des équipements, des vivres ou des services utiles.', target: 'nature' },
];

const amounts = [2000, 5000, 10000, 25000, 50000, 100000];

const paymentMethods = [
  { id: 'mobile-money' as PaymentMethod, label: 'Mobile Money', description: 'Disponibilité à confirmer', icon: '📱' },
  { id: 'carte' as PaymentMethod, label: 'Carte bancaire', description: 'Disponibilité à confirmer', icon: '💳' },
  { id: 'virement' as PaymentMethod, label: 'Virement bancaire', description: 'Coordonnées communiquées après validation', icon: '🏦' },
  { id: 'international' as PaymentMethod, label: 'Paiement international', description: 'Disponibilité à confirmer', icon: '🌐' },
];

function formatCardNumber(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(v: string) {
  return v.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d{1,2})/, '$1/$2');
}

type Props = { confirmed?: boolean };

export default function DonatePage({ confirmed }: Props) {
  const { navigate, selectedId } = useNavigation();

  // If coming from a project, start at step 2 with 'projet' pre-selected
  const fromProject = selectedId === 'projet';
  const [step, setStep] = useState(confirmed ? 5 : fromProject ? 2 : 1);
  const [type, setType] = useState<DonationType>(fromProject ? 'projet' : 'ponctuel');
  const [target, setTarget] = useState<DonationTarget>(fromProject ? 'projet' : 'general');
  const [amount, setAmount] = useState<number | null>(10000);
  const [customAmount, setCustomAmount] = useState('');
  const [frequency, setFrequency] = useState<'mensuel' | 'trimestriel' | 'annuel'>('mensuel');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('mobile-money');

  // Card details
  const [card, setCard] = useState({ numero: '', expiry: '', cvv: '', titulaire: '' });
  // Bank transfer details
  const [bank, setBank] = useState({ titulaire: '', iban: '', banque: '', reference: '' });
  // Mobile money
  const [mobile, setMobile] = useState({ telephone: '', operateur: '' });

  // Coordonnées du donateur : validées par Zod. Les champs de paiement ci-dessus ne sont JAMAIS envoyés à l'API.
  const { register, handleSubmit, watch, formState: { errors, submitCount } } = useZodForm(donationSchema, {
    type: 'ponctuel', target: 'general', nom: '', email: '', telephone: '', natureDescription: '',
  });
  const natureDescription = watch('natureDescription') ?? '';
  const mutation = useMutation({
    mutationFn: api.submitDonationInterest,
    onSuccess: () => navigate('donate-confirm'),
  });

  useEffect(() => { if (confirmed) setStep(5); else setStep(s => (s === 5 ? 1 : s)); }, [confirmed]);

  const finalAmount = customAmount ? parseInt(customAmount.replace(/\D/, '')) : amount;
  const steps = ['Don', 'Montant', 'Paiement', 'Infos', 'Confirmation'];

  const paymentComplete = () => {
    if (payMethod === 'carte') return card.numero.replace(/\s/g,'').length === 16 && card.expiry.length === 5 && card.cvv.length >= 3 && card.titulaire.trim().length > 2;
    if (payMethod === 'virement') return bank.titulaire.trim().length > 2;
    if (payMethod === 'mobile-money') return mobile.telephone.trim().length >= 8;
    return true;
  };

  if (step === 5) {
    return (
      <>
        <PageHero title="Simulation terminée" breadcrumbs={[{ label: 'Faire un don', page: 'donate' }, { label: 'Confirmation' }]} compact />
        <section className="py-16 bg-white">
          <div className="max-w-xl mx-auto px-4 text-center">
            <div className="text-7xl mb-6" aria-hidden="true">❤️</div>
            <h2 className="text-2xl font-bold text-slate-900 font-display mb-4">Votre parcours de don est prêt</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6 text-left space-y-2">
              {finalAmount && <div className="flex justify-between text-sm"><span className="text-slate-500">Montant</span><span className="font-bold text-slate-900">{finalAmount.toLocaleString('fr-FR')} FCFA</span></div>}
              <div className="flex justify-between text-sm"><span className="text-slate-500">Type</span><span className="font-bold text-slate-900">{supportForms.find(item => item.id === type)?.label}</span></div>
              {type === 'regulier' && <div className="flex justify-between text-sm"><span className="text-slate-500">Périodicité</span><span className="font-bold text-slate-900 capitalize">{frequency}</span></div>}
              <div className="flex justify-between text-sm"><span className="text-slate-500">Affectation</span><span className="font-bold text-slate-900">{targets.find(t => t.id === target)?.label}</span></div>
              {type !== 'nature' && <div className="flex justify-between text-sm"><span className="text-slate-500">Paiement</span><span className="font-bold text-slate-900">{paymentMethods.find(p => p.id === payMethod)?.label}</span></div>}
            </div>
            <p className="text-slate-600 text-sm mb-8">Cette maquette ne réalise aucun paiement et n’enregistre aucune donnée. La confirmation réelle et l’émission d’un reçu seront activées uniquement après connexion d’un service de paiement validé par la CAPH-CI.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => navigate('home')} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm">Retour à l'accueil</button>
              <button onClick={() => navigate('projects')} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm">Voir nos projets</button>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero
        title="Faire un don"
        subtitle="Votre générosité permet à la CAPH-CI de défendre les droits et l'inclusion des personnes handicapées en Côte d'Ivoire."
        breadcrumbs={[{ label: 'Faire un don' }]}
        compact
      />

      <section className="py-12 bg-white">
        <div className="max-w-2xl mx-auto px-4">
          {/* Progress */}
          <nav aria-label="Étapes du don" className="mb-10">
            <ol className="flex items-center">
              {steps.map((s, i) => (
                <li key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`} aria-current={step === i + 1 ? 'step' : undefined}>
                      {step > i + 1 ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs mt-1 whitespace-nowrap ${step === i + 1 ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>{s}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-4 ${step > i + 1 ? 'bg-green-500' : 'bg-slate-200'}`} aria-hidden="true" />
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* Step 1: Type & Target */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-display mb-2">Choisissez votre forme de soutien</h2>
              <p className="text-sm text-slate-600 mb-6">Quatre formes de soutien sont prévues par le document institutionnel.</p>
              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {supportForms.map(item => (
                  <button key={item.id} onClick={() => { setType(item.id); setTarget(item.target); }} className={`p-4 rounded-xl font-semibold text-left transition-colors border-2 ${type === item.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 text-slate-700 hover:border-blue-300'}`}>
                    <span className="block text-slate-900">{item.label}</span>
                    <span className="block text-xs font-normal text-slate-600 mt-2">{item.description}</span>
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 mb-6">
                <h3 className="font-bold text-slate-900 font-display mb-3">Priorités soutenues par les contributions</h3>
                <ul className="grid sm:grid-cols-2 gap-2 text-sm text-slate-600">
                  <li>Formation, emploi et autonomisation</li>
                  <li>Santé et protection sociale</li>
                  <li>Accessibilité et autonomie</li>
                  <li>Éducation et solidarité</li>
                </ul>
                <p className="text-xs text-slate-500 mt-4 leading-relaxed">Chaque contribution devra être enregistrée et confirmée. Les dons affectés à un projet seront utilisés conformément à la destination convenue avec le donateur.</p>
              </div>
              <button onClick={() => setStep(type === 'nature' ? 4 : 2)} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">Continuer →</button>
            </div>
          )}

          {/* Step 2: Amount */}
          {step === 2 && (
            <div>
              {fromProject && (
                <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-2xl" aria-hidden="true">📋</span>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">Soutien à un projet</div>
                    <div className="text-slate-500 text-xs">Votre don sera affecté directement au projet sélectionné.</div>
                  </div>
                </div>
              )}
              <h2 className="text-xl font-bold text-slate-900 font-display mb-6">Choisissez le montant</h2>
              {type === 'regulier' && (
                <div className="mb-6">
                  <label htmlFor="don-frequency" className="block text-sm font-medium text-slate-700 mb-2">Périodicité du soutien</label>
                  <select id="don-frequency" value={frequency} onChange={event => setFrequency(event.target.value as typeof frequency)} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm focus:border-blue-600 outline-none bg-white">
                    <option value="mensuel">Chaque mois</option>
                    <option value="trimestriel">Chaque trimestre</option>
                    <option value="annuel">Chaque année</option>
                  </select>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {amounts.map(a => (
                  <button key={a} onClick={() => { setAmount(a); setCustomAmount(''); }} className={`py-3 rounded-xl font-semibold text-sm border-2 transition-colors ${amount === a && !customAmount ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-700 hover:border-blue-300'}`}>
                    {a.toLocaleString('fr-FR')}
                    <span className="text-xs ml-1 opacity-70">FCFA</span>
                  </button>
                ))}
              </div>
              <div className="mb-8">
                <label htmlFor="custom-amount" className="block text-sm font-medium text-slate-700 mb-2">Autre montant (FCFA)</label>
                <input id="custom-amount" type="number" min="500" placeholder="Entrer un montant..." value={customAmount}
                  onChange={e => { setCustomAmount(e.target.value); setAmount(null); }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm focus:border-blue-600 outline-none text-lg font-bold" />
              </div>
              {finalAmount && (
                <div className="bg-blue-50 rounded-xl p-4 mb-6 flex justify-between items-center">
                  <span className="text-slate-600 text-sm">Montant de votre don</span>
                  <span className="text-xl font-bold text-blue-600 font-display">{finalAmount.toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              <div className="flex gap-3">
                {!fromProject && <button onClick={() => setStep(1)} className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">← Retour</button>}
                <button onClick={() => setStep(3)} disabled={!finalAmount} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Continuer →</button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-display mb-6">Mode de paiement</h2>
              <div className="space-y-3 mb-6">
                {paymentMethods.map(pm => (
                  <button key={pm.id} onClick={() => setPayMethod(pm.id)} className={`w-full flex gap-4 p-4 rounded-xl border-2 text-left transition-colors ${payMethod === pm.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                    <span className="text-2xl flex-shrink-0" aria-hidden="true">{pm.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 text-sm">{pm.label}</div>
                      <div className="text-slate-500 text-xs">{pm.description}</div>
                    </div>
                    {payMethod === pm.id && <span className="ml-auto text-blue-600 font-bold" aria-hidden="true">✓</span>}
                  </button>
                ))}
              </div>

              {/* Mobile Money details */}
              {payMethod === 'mobile-money' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 mb-6">
                  <h3 className="font-bold text-slate-900 font-display text-sm">Informations Mobile Money</h3>
                  <div>
                    <label htmlFor="operateur" className="block text-xs font-medium text-slate-700 mb-1">Opérateur *</label>
                    <select id="operateur" value={mobile.operateur} onChange={e => setMobile(p => ({ ...p, operateur: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 outline-none bg-white">
                      <option value="">Opérateur à confirmer</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="tel-mm" className="block text-xs font-medium text-slate-700 mb-1">Numéro de téléphone *</label>
                    <input id="tel-mm" type="tel" placeholder="+225 07 00 00 00 00" value={mobile.telephone}
                      onChange={e => setMobile(p => ({ ...p, telephone: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 outline-none" />
                  </div>
                  <p className="text-slate-500 text-xs">Prototype uniquement : aucune demande de paiement ne sera envoyée sur ce numéro.</p>
                </div>
              )}

              {/* Carte bancaire details */}
              {payMethod === 'carte' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 mb-6">
                  <h3 className="font-bold text-slate-900 font-display text-sm flex items-center gap-2">
                    <span>💳</span> Informations de carte bancaire
                  </h3>
                  <div>
                    <label htmlFor="card-titulaire" className="block text-xs font-medium text-slate-700 mb-1">Nom du titulaire *</label>
                    <input id="card-titulaire" type="text" placeholder="NOM Prénom" value={card.titulaire}
                      onChange={e => setCard(p => ({ ...p, titulaire: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 outline-none font-mono" />
                  </div>
                  <div>
                    <label htmlFor="card-numero" className="block text-xs font-medium text-slate-700 mb-1">Numéro de carte *</label>
                    <input id="card-numero" type="text" inputMode="numeric" placeholder="0000 0000 0000 0000"
                      value={card.numero}
                      onChange={e => setCard(p => ({ ...p, numero: formatCardNumber(e.target.value) }))}
                      maxLength={19}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 outline-none font-mono tracking-widest" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="card-expiry" className="block text-xs font-medium text-slate-700 mb-1">Date d'expiration *</label>
                      <input id="card-expiry" type="text" inputMode="numeric" placeholder="MM/AA"
                        value={card.expiry}
                        onChange={e => setCard(p => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                        maxLength={5}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 outline-none font-mono" />
                    </div>
                    <div>
                      <label htmlFor="card-cvv" className="block text-xs font-medium text-slate-700 mb-1">CVV *</label>
                      <input id="card-cvv" type="text" inputMode="numeric" placeholder="•••"
                        value={card.cvv}
                        onChange={e => setCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g,'').slice(0,4) }))}
                        maxLength={4}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 outline-none font-mono" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-slate-400 text-xs">🔒</span>
                    <span className="text-slate-500 text-xs">Prototype uniquement — aucune donnée bancaire n’est transmise ou stockée</span>
                  </div>
                </div>
              )}

              {/* Virement bancaire details */}
              {payMethod === 'virement' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 mb-6">
                  <h3 className="font-bold text-slate-900 font-display text-sm flex items-center gap-2">
                    <span>🏦</span> Virement bancaire
                  </h3>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-slate-700">
                    Les coordonnées bancaires ne sont pas affichées publiquement. Elles pourront être communiquées par la CAPH-CI lorsque ce moyen de paiement aura été officiellement validé.
                  </div>
                  <p className="text-slate-600 text-xs">Indiquez votre nom pour poursuivre la simulation :</p>
                  <div>
                    <label htmlFor="bank-titulaire" className="block text-xs font-medium text-slate-700 mb-1">Nom du donateur *</label>
                    <input id="bank-titulaire" type="text" placeholder="Votre nom complet" value={bank.titulaire}
                      onChange={e => setBank(p => ({ ...p, titulaire: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 outline-none" />
                  </div>
                </div>
              )}

              {/* International */}
              {payMethod === 'international' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 text-sm space-y-3">
                  <h3 className="font-bold text-slate-900 font-display text-sm">Paiement international</h3>
                  <p className="text-slate-600 text-xs">Les solutions de paiement international seront présentées uniquement après validation officielle par la CAPH-CI.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">← Retour</button>
                <button onClick={() => setStep(4)} disabled={!paymentComplete()} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Continuer →</button>
              </div>
            </div>
          )}

          {/* Step 4: Info */}
          {step === 4 && (
            <form noValidate onSubmit={handleSubmit(values => {
              return mutation.mutateAsync({
                ...values,
                type,
                target,
                frequency: type === 'regulier' ? frequency : undefined,
                amount: type !== 'nature' && finalAmount ? finalAmount : undefined,
              }).catch(() => undefined);
            })}>
              <ErrorSummary errors={errors} ids={{ nom: 'don-nom', email: 'don-email', telephone: 'don-telephone', natureDescription: 'nature-description' }} show={submitCount > 0} submitCount={submitCount} />
              <h2 className="text-xl font-bold text-slate-900 font-display mb-2">Vos informations</h2>
              <p className="text-slate-500 text-sm mb-6">{type === 'nature' ? 'La CAPH-CI vous contactera pour convenir des modalités de remise.' : 'Pour préparer la confirmation et le suivi de votre soutien.'}</p>
              <div className="space-y-4 mb-8">
                {[
                  { id: 'nom', label: 'Nom & Prénom *', type: 'text', placeholder: 'Votre nom', key: 'nom' as const },
                  { id: 'email', label: 'Email *', type: 'email', placeholder: 'votre@email.com', key: 'email' as const },
                  { id: 'telephone', label: 'Téléphone *', type: 'tel', placeholder: '+225 07 00 00 00 00', key: 'telephone' as const },
                ].map(f => (
                  <div key={f.id}>
                    <label htmlFor={`don-${f.id}`} className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                    <input {...register(f.key)} {...a11y(errors, f.key, `don-${f.id}`)} type={f.type} placeholder={f.placeholder}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                    <FieldError errors={errors} name={f.key} id={`don-${f.id}`} />
                  </div>
                ))}
                {type === 'nature' && (
                  <div>
                    <label htmlFor="nature-description" className="block text-sm font-medium text-slate-700 mb-1">Bien, équipement, vivre ou service proposé *</label>
                    <textarea {...register('natureDescription')} {...a11y(errors, 'natureDescription', 'nature-description')} rows={4} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
                    <FieldError errors={errors} name="natureDescription" id="nature-description" />
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-5 mb-6 space-y-2">
                <h3 className="font-bold text-slate-900 font-display text-sm mb-3">Récapitulatif</h3>
                {[
                  { label: 'Type', value: supportForms.find(item => item.id === type)?.label ?? type },
                  ...(type === 'regulier' ? [{ label: 'Périodicité', value: frequency === 'mensuel' ? 'Mensuelle' : frequency === 'trimestriel' ? 'Trimestrielle' : 'Annuelle' }] : []),
                  { label: 'Affectation', value: targets.find(t => t.id === target)?.label ?? '' },
                  ...(type !== 'nature' ? [
                    { label: 'Montant', value: `${finalAmount?.toLocaleString('fr-FR')} FCFA` },
                    { label: 'Paiement', value: paymentMethods.find(p => p.id === payMethod)?.label ?? '' },
                  ] : [{ label: 'Proposition', value: natureDescription || 'À préciser' }]),
                ].map(s => (
                  <div key={s.label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{s.label}</span>
                    <span className="font-medium text-slate-900">{s.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">← Retour</button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  aria-busy={mutation.isPending}
                  className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
                >
                  {mutation.isPending ? 'Envoi en cours…' : 'Terminer la simulation'}
                </button>
              </div>
              <div className="mt-4"><ApiErrorAlert message={mutation.error?.message} /></div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import PageHero from '../components/PageHero';
import { api } from '../api';
import { partnershipSchema } from '../schemas/forms';
import { useZodForm } from '../components/forms/useZodForm';
import { a11y, ApiErrorAlert, ErrorSummary, FieldError } from '../components/forms/FormKit';
import { useNavigation } from '../context/NavigationContext';

const partnerTypes = [
  { icon: '🏢', title: 'Entreprises', description: 'Intégrez le handicap dans votre politique RSE, recrutez des profils handicapés et contribuez à une économie inclusive.' },
  { icon: '🏛️', title: 'Administrations & Collectivités', description: 'Collaborez avec la CAPH-CI pour rendre vos services accessibles et inclusifs pour tous les citoyens.' },
  { icon: '🌐', title: 'ONG & Fondations', description: 'Mutualisez vos ressources et expertises pour un impact plus fort en faveur des personnes handicapées.' },
  { icon: '🌍', title: 'Organisations internationales', description: 'Rejoignez nos partenaires techniques et financiers internationaux pour des projets à grande échelle.' },
];

type Props = { confirmed?: boolean };

export default function PartnerPage({ confirmed }: Props) {
  const { navigate } = useNavigation();
  const [step, setStep] = useState<'form' | 'confirm'>(confirmed ? 'confirm' : 'form');
  useEffect(() => { setStep(confirmed ? 'confirm' : 'form'); }, [confirmed]);
  const { register, handleSubmit, formState: { errors, submitCount } } = useZodForm(partnershipSchema, {
    organisation: '', responsable: '', fonction: '', telephone: '', email: '',
    typeOrg: '', domaine: '', collaboration: '', message: '',
  });
  const mutation = useMutation({
    mutationFn: api.submitPartnership,
    onSuccess: () => navigate('partner-confirm'),
  });
  const onSubmit = handleSubmit(values => mutation.mutateAsync(values).catch(() => undefined));
  const fieldIds = { message: 'message-partner' };

  if (step === 'confirm') {
    return (
      <>
        <PageHero title="Demande reçue !" breadcrumbs={[{ label: 'Devenir partenaire', page: 'partner' }, { label: 'Confirmation' }]} compact />
        <section className="py-16 bg-white">
          <div className="max-w-xl mx-auto px-4 text-center">
            <div className="text-7xl mb-6" aria-hidden="true">🤝</div>
            <h2 className="text-2xl font-bold text-slate-900 font-display mb-4">Merci pour votre intérêt !</h2>
            <p className="text-slate-600 mb-4">Votre proposition de partenariat a bien été reçue. L'équipe CAPH-CI analysera votre demande et vous contactera dans les <strong>5 jours ouvrables</strong>.</p>
            <p className="text-slate-500 text-sm mb-8">Vous recevrez un accusé de réception par email. Pour toute urgence, contactez-nous au 07 08 24 95 30.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => navigate('home')} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm">Retour à l'accueil</button>
              <button onClick={() => navigate('contact')} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm">Nous contacter</button>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero
        title="Devenir partenaire"
        subtitle="Rejoignez les entreprises, institutions et organisations qui s'engagent avec la CAPH-CI pour une Côte d'Ivoire inclusive."
        breadcrumbs={[{ label: 'Devenir partenaire' }]}
      />

      {/* Partner types */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-slate-900 font-display mb-6 text-center">Types de partenariats</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {partnerTypes.map(p => (
              <div key={p.title} className="p-5 rounded-xl border border-slate-200 hover:border-blue-200 text-center transition-colors">
                <div className="text-3xl mb-3" aria-hidden="true">{p.icon}</div>
                <h3 className="font-bold text-slate-900 font-display text-sm mb-2">{p.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>

          {/* Benefits */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 mb-12">
            <h2 className="text-xl font-bold text-slate-900 font-display mb-6 text-center">Pourquoi s'associer à la CAPH-CI ?</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: '🌟', title: 'Visibilité nationale', text: 'Votre logo sur nos supports officiels, portail web et événements nationaux.' },
                { icon: '🎯', title: 'Impact concret', text: 'Contribuez directement à des projets qui transforment les conditions de vie des PH.' },
                { icon: '🤝', title: 'Réseau exclusif', text: 'Accédez au réseau des 37 organisations affiliées et des délégations régionales.' },
                { icon: '📊', title: 'Rapport d\'impact', text: 'Recevez un rapport annuel détaillé sur l\'utilisation de votre contribution.' },
                { icon: '💼', title: 'Expertise RSE', text: 'Bénéficiez de l\'expertise du Cabinet CAPH-CI Conseil pour vos enjeux handicap.' },
                { icon: '🏅', title: 'Reconnaissance', text: 'Label Partenaire CAPH-CI valorisable dans votre communication RSE et ESG.' },
              ].map(b => (
                <div key={b.title} className="flex gap-3">
                  <span className="text-xl flex-shrink-0" aria-hidden="true">{b.icon}</span>
                  <div>
                    <div className="font-bold text-slate-900 text-sm font-display">{b.title}</div>
                    <p className="text-slate-600 text-xs">{b.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 font-display mb-6 text-center">Proposer un partenariat</h2>
            <form onSubmit={onSubmit} noValidate className="space-y-5 bg-white border border-slate-200 rounded-2xl p-8">
              <ErrorSummary errors={errors} ids={fieldIds} show={submitCount > 0} submitCount={submitCount} />
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { id: 'organisation', label: 'Organisation *', type: 'text', placeholder: 'Nom de votre organisation', key: 'organisation' as const },
                  { id: 'responsable', label: 'Responsable *', type: 'text', placeholder: 'Nom & Prénom', key: 'responsable' as const },
                  { id: 'fonction', label: 'Fonction *', type: 'text', placeholder: 'Votre poste', key: 'fonction' as const },
                  { id: 'telephone', label: 'Téléphone *', type: 'tel', placeholder: '+225 07 00 00 00 00', key: 'telephone' as const },
                  { id: 'email', label: 'Email *', type: 'email', placeholder: 'votre@email.com', key: 'email' as const },
                ].map(f => (
                  <div key={f.id} className={f.id === 'email' ? 'sm:col-span-2' : ''}>
                    <label htmlFor={f.id} className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                    <input {...register(f.key)} {...a11y(errors, f.key, f.id)} type={f.type} placeholder={f.placeholder}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                    <FieldError errors={errors} name={f.key} id={f.id} />
                  </div>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="typeOrg" className="block text-sm font-medium text-slate-700 mb-1">Type d'organisation *</label>
                  <select {...register('typeOrg')} {...a11y(errors, 'typeOrg', 'typeOrg')} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 outline-none bg-white">
                    <option value="">Choisir...</option>
                    {['Entreprise privée', 'Administration publique', 'Collectivité territoriale', 'ONG', 'Fondation', 'Organisation internationale', 'Autre'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <FieldError errors={errors} name="typeOrg" id="typeOrg" />
                </div>
                <div>
                  <label htmlFor="collaboration" className="block text-sm font-medium text-slate-700 mb-1">Type de collaboration *</label>
                  <select {...register('collaboration')} {...a11y(errors, 'collaboration', 'collaboration')} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 outline-none bg-white">
                    <option value="">Choisir...</option>
                    {['Partenariat technique', 'Partenariat financier', 'Partenariat RSE', 'Partenariat de projet', 'Mécénat', 'Autre'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <FieldError errors={errors} name="collaboration" id="collaboration" />
                </div>
              </div>

              <div>
                <label htmlFor="domaine" className="block text-sm font-medium text-slate-700 mb-1">Domaine de partenariat</label>
                <input {...register('domaine')} id="domaine" type="text" placeholder="Ex : Emploi inclusif, accessibilité numérique..."
                
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label htmlFor="message-partner" className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
                <textarea {...register('message')} {...a11y(errors, 'message', 'message-partner')} rows={5} placeholder="Décrivez votre projet de partenariat, vos objectifs et ce que vous souhaitez apporter à la CAPH-CI..."
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
                <FieldError errors={errors} name="message" id="message-partner" />
              </div>

              <ApiErrorAlert message={mutation.error?.message} />
              <button type="submit" disabled={mutation.isPending} aria-busy={mutation.isPending} className="w-full py-3.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-wait">
                {mutation.isPending ? 'Envoi en cours…' : 'Envoyer ma proposition de partenariat'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import PageHero from '../components/PageHero';
import { api } from '../api';
import { contactSchema } from '../schemas/forms';
import { useZodForm } from '../components/forms/useZodForm';
import { a11y, ApiErrorAlert, ErrorSummary, FieldError } from '../components/forms/FormKit';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, submitCount } } = useZodForm(contactSchema, {
    nom: '', organisation: '', telephone: '', email: '', sujet: '', message: '', privacy: false as unknown as true,
  });
  const mutation = useMutation({
    mutationFn: api.submitContact,
    onSuccess: () => {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });
  const onSubmit = handleSubmit(values => mutation.mutateAsync(values).catch(() => undefined));
  const fieldIds = { message: 'message-contact', privacy: 'privacy' };

  return (
    <>
      <PageHero
        title="Contact"
        subtitle="Une question, un projet ou une demande d’information ? Contactez la CAPH-CI."
        breadcrumbs={[{ label: 'Contact' }]}
        compact
      />

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact info */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display mb-5">Nos coordonnées</h2>
                <div className="space-y-4">
                  {[
                    { icon: '📍', label: 'Adresse', value: 'Abidjan, Abobo Sogefiha\nNon loin du Terrain des 4 Étages, APP 1400' },
                    { icon: '📞', label: 'Téléphone 1', value: '07 08 24 95 30', href: 'tel:+2250708249530' },
                    { icon: '📞', label: 'Téléphone 2', value: '05 05 28 39 55', href: 'tel:+2250505283955' },
                    { icon: '📞', label: 'Téléphone 3', value: '01 42 09 96 96', href: 'tel:+2250142099696' },
                    { icon: '✉️', label: 'Email', value: 'caphci2011@gmail.com', href: 'mailto:caphci2011@gmail.com' },
                  ].map(c => (
                    <div key={c.label} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">{c.icon}</span>
                      <div>
                        <div className="text-xs text-slate-500 font-medium mb-0.5">{c.label}</div>
                        {c.href ? (
                          <a href={c.href} className="text-slate-900 text-sm font-medium hover:text-blue-600 transition-colors">{c.value}</a>
                        ) : (
                          <div className="text-slate-900 text-sm font-medium whitespace-pre-line">{c.value}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 font-display mb-3">Réseaux sociaux</h3>
                <div className="flex gap-3">
                  {[{ name: 'Facebook', icon: 'f' }, { name: 'Twitter', icon: 'X' }, { name: 'LinkedIn', icon: 'in' }, { name: 'YouTube', icon: '▶' }].map(s => (
                    <button key={s.name} className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors font-bold text-sm" aria-label={s.name}>
                      {s.icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
                <h3 className="font-bold text-slate-900 font-display mb-2">Localisation</h3>
                <p className="text-sm text-slate-600">La carte sera intégrée après confirmation des coordonnées géographiques exactes du siège.</p>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-slate-900 font-display mb-6">Envoyez-nous un message</h2>

              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
                  <div className="text-5xl mb-4" aria-hidden="true">✅</div>
                  <h3 className="text-xl font-bold text-slate-900 font-display mb-2">Message envoyé !</h3>
                  <p className="text-slate-600 mb-4">Nous avons bien reçu votre message. Cette confirmation appartient au prototype et aucune donnée n’a été transmise.</p>
                  <button onClick={() => { reset(); mutation.reset(); setSubmitted(false); }} className="text-blue-600 text-sm hover:underline">Envoyer un autre message</button>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate className="space-y-5 bg-white border border-slate-200 rounded-2xl p-8">
                  <ErrorSummary errors={errors} ids={fieldIds} show={submitCount > 0} submitCount={submitCount} />
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { id: 'nom', label: 'Nom & Prénom *', type: 'text', placeholder: 'Votre nom', key: 'nom' as const },
                      { id: 'organisation', label: 'Organisation', type: 'text', placeholder: 'Optionnel', key: 'organisation' as const },
                      { id: 'telephone', label: 'Téléphone', type: 'tel', placeholder: '+225 07 00 00 00 00', key: 'telephone' as const },
                      { id: 'email', label: 'Email *', type: 'email', placeholder: 'votre@email.com', key: 'email' as const },
                    ].map(f => (
                      <div key={f.id}>
                        <label htmlFor={f.id} className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                        <input {...register(f.key)} {...a11y(errors, f.key, f.id)} type={f.type} placeholder={f.placeholder}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                        <FieldError errors={errors} name={f.key} id={f.id} />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label htmlFor="sujet" className="block text-sm font-medium text-slate-700 mb-1">Sujet *</label>
                    <select {...register('sujet')} {...a11y(errors, 'sujet', 'sujet')} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 outline-none bg-white">
                      <option value="">Choisir un sujet...</option>
                      {[
                        'Informations générales',
                        'Demande de partenariat',
                        'Adhésion à la CAPH-CI',
                        'Opportunités et projets',
                        'Cabinet CAPH-CI Conseil',
                        'Média et communication',
                        'Réclamation ou signalement',
                        'Autre',
                      ].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <FieldError errors={errors} name="sujet" id="sujet" />
                  </div>

                  <div>
                    <label htmlFor="message-contact" className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
                    <textarea {...register('message')} {...a11y(errors, 'message', 'message-contact')} rows={6} placeholder="Décrivez votre demande avec le plus de détails possible..."
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
                    <FieldError errors={errors} name="message" id="message-contact" />
                  </div>

                  <div className="flex items-start gap-3">
                    <input {...register('privacy')} {...a11y(errors, 'privacy', 'privacy')} type="checkbox" className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                    <label htmlFor="privacy" className="text-xs text-slate-500">
                      En soumettant ce formulaire, j'accepte que mes données personnelles soient utilisées par la CAPH-CI pour traiter ma demande. Ces données ne seront pas partagées avec des tiers.
                    </label>
                  </div>
                  <FieldError errors={errors} name="privacy" id="privacy" />

                  <ApiErrorAlert message={mutation.error?.message} />
                  <button type="submit" disabled={mutation.isPending} aria-busy={mutation.isPending} className="w-full py-3.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-wait">
                    {mutation.isPending ? 'Envoi en cours…' : 'Envoyer le message'}
                  </button>
                </form>
              )}

              {/* Quick links */}
              <div className="mt-8 p-6 rounded-xl bg-slate-50 border border-slate-200">
                <h3 className="font-bold text-slate-900 font-display mb-4">Liens utiles</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { label: 'FAQ', sub: 'Questions fréquentes', icon: '❓' },
                    { label: 'Ressources', sub: 'Documents & guides', icon: '📄' },
                    { label: 'Délégations', sub: 'Trouver une délégation', icon: '📍' },
                  ].map(l => (
                    <div key={l.label} className="p-3 rounded-lg bg-white border border-slate-200 text-center">
                      <div className="text-xl mb-1" aria-hidden="true">{l.icon}</div>
                      <div className="font-semibold text-slate-900 text-xs">{l.label}</div>
                      <div className="text-slate-400 text-xs">{l.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

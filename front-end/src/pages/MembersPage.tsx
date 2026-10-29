import { useState } from 'react';
import PageHero from '../components/PageHero';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { loginSchema } from '../schemas/forms';
import { useZodForm } from '../components/forms/useZodForm';
import { a11y, ApiErrorAlert, ErrorSummary, FieldError } from '../components/forms/FormKit';

export default function MembersPage() {
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { login, isLoggingIn } = useAuth();
  const { navigate } = useNavigation();
  const { register, handleSubmit, formState: { errors, submitCount } } = useZodForm(loginSchema, { email: '', password: '' });
  const onSubmit = handleSubmit(async values => {
    if (isLoggingIn) return;
    setApiError(null);
    try {
      await login(values);
      navigate('members-dashboard');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Connexion impossible.');
    }
  });

  return (
    <>
      <PageHero
        title="Espace membres"
        subtitle="Accès réservé aux organisations et personnes autorisées par la CAPH-CI."
        breadcrumbs={[{ label: 'Espace membres' }]}
        compact
      />
      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">Accès sécurisé</p>
              <h2 className="text-3xl font-bold text-slate-900 font-display mb-4">Bienvenue dans votre espace</h2>
              <p className="text-slate-600 leading-relaxed mb-8">
                Cet espace permettra aux membres autorisés de consulter les communications internes, mettre à jour leur profil organisationnel et transmettre des informations à la CAPH-CI.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {['Profil de l’organisation', 'Documents internes', 'Opportunités réservées', 'Communications internes', 'Soumission de rapports', 'Proposition d’actualités'].map(item => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              {submitted ? (
                <div role="status" className="py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10 3h4l7 18H3L10 3Z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 font-display mb-2">Connexion non activée</h2>
                  <p className="text-sm text-slate-600">Cette maquette présente le futur parcours membre. Aucun compte réel n’est connecté à ce stade.</p>
                  <button onClick={() => setSubmitted(false)} className="mt-5 text-sm font-bold text-blue-700 hover:underline">Retour au formulaire</button>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate className="space-y-5">
                  <ErrorSummary errors={errors} ids={{ email: 'member-email', password: 'member-password' }} show={submitCount > 0} submitCount={submitCount} />
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 font-display">Se connecter</h2>
                    <p className="text-sm text-slate-500 mt-1">Fonctionnalité présentée à titre de prototype.</p>
                  </div>
                  <div>
                    <label htmlFor="member-email" className="block text-sm font-bold text-slate-700 mb-1.5">Adresse email</label>
                    <input {...register('email')} {...a11y(errors, 'email', 'member-email')} type="email" autoComplete="email" className="w-full min-h-11 rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none" />
                    <FieldError errors={errors} name="email" id="member-email" />
                  </div>
                  <div>
                    <label htmlFor="member-password" className="block text-sm font-bold text-slate-700 mb-1.5">Mot de passe</label>
                    <input {...register('password')} {...a11y(errors, 'password', 'member-password')} type="password" autoComplete="current-password" className="w-full min-h-11 rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none" />
                    <FieldError errors={errors} name="password" id="member-password" />
                  </div>
                  <ApiErrorAlert message={apiError} />
                  <button type="submit" disabled={isLoggingIn} aria-busy={isLoggingIn} className="w-full min-h-11 rounded-lg bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-wait">{isLoggingIn ? 'Connexion…' : 'Se connecter'}</button>
                  <button type="button" onClick={() => setSubmitted(true)} className="w-full min-h-11 text-sm font-bold text-blue-700 hover:underline">Mot de passe oublié ?</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

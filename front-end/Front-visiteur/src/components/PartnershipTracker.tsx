import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api';
import { trackingSchema } from '../schemas/forms';
import { useZodForm } from './forms/useZodForm';
import { a11y, ApiErrorAlert, FieldError } from './forms/FormKit';
import Modal from './Modal';
import type { PartnershipStatusCode } from '../types';

const steps: { code: PartnershipStatusCode; label: string }[] = [
  { code: 'recue', label: 'Reçue' },
  { code: 'en_analyse', label: 'En analyse' },
  { code: 'traitee', label: 'Traitée' },
];

const badge: Record<PartnershipStatusCode, string> = {
  recue: 'bg-slate-100 text-slate-800',
  en_analyse: 'bg-blue-100 text-blue-900',
  complement: 'bg-orange-100 text-orange-900',
  traitee: 'bg-green-100 text-green-900',
};

/** Suivi d'une demande de partenariat : saisie de la référence, résultat dans une popup. */
export default function PartnershipTracker() {
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useZodForm(trackingSchema, { reference: '' });
  const mutation = useMutation({ mutationFn: api.trackPartnership, onSuccess: () => setOpen(true) });
  const onSubmit = handleSubmit(values => mutation.mutateAsync(values.reference).catch(() => undefined));
  const result = mutation.data;
  const currentIndex = result ? steps.findIndex(s => s.code === result.status) : -1;

  return (

    <section aria-labelledby="tracking-title" className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-8">
      <h2 id="tracking-title" className="text-xl font-bold text-slate-900 font-display">Suivre ma demande</h2>
      <p className="mt-1 text-sm text-slate-600">Saisissez la référence reçue lors de l’envoi de votre proposition pour savoir où en est son traitement.</p>

      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-3">
        <div>
          <label htmlFor="tracking-reference" className="block text-sm font-medium text-slate-700 mb-1">Référence de la demande</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              {...register('reference')}
              {...a11y(errors, 'reference', 'tracking-reference', 'tracking-hint')}
              type="text"
              autoComplete="off"
              placeholder="CAPH-PAR-2026-1234"
              className="flex-1 min-h-11 px-3 py-2.5 rounded-lg border border-slate-300 text-sm uppercase placeholder:normal-case focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
            />
            <button type="submit" disabled={mutation.isPending} aria-busy={mutation.isPending} className="min-h-11 px-6 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer">
              {mutation.isPending ? 'Vérification…' : 'Vérifier'}
            </button>
          </div>
          <p id="tracking-hint" className="mt-1 text-xs text-slate-500">Format : CAPH-PAR-AAAA-NNNN</p>
          <FieldError errors={errors} name="reference" id="tracking-reference" />
        </div>
        <ApiErrorAlert message={mutation.error?.message} />
      </form>

      <Modal open={open && Boolean(result)} onClose={() => setOpen(false)} title="Suivi de votre demande">
        {result && (
          <div>
            
            <p className="mt-2 text-sm text-slate-500">Référence</p>
            <p className="font-bold text-slate-900">{result.reference}</p>


            <p className={`mt-4 inline-flex rounded-full px-3 py-1 text-sm font-bold ${badge[result.status]}`}>{result.label}</p>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">{result.message}</p>

            <ol className="mt-5 flex items-center gap-2 text-xs" aria-label="Étapes du traitement">
              {steps.map((step, index) => {
                const done = currentIndex >= 0 ? index <= currentIndex : result.status === 'complement' && index <= 1;
                return (
                  <li key={step.code} className={`flex-1 rounded-lg border px-2 py-2 text-center font-semibold ${done ? 'border-[#006B35] bg-green-50 text-[#006B35]' : 'border-slate-200 text-slate-500'}`}>
                    {done ? '✓ ' : ''}{step.label}
                  </li>
                );
              })}
            </ol>
        
            <button onClick={() => setOpen(false)} className="mt-5 w-full min-h-11 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">Fermer</button>
          </div>
        )}
      </Modal>
    </section>
  );
}
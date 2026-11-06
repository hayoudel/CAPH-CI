import { useRef } from 'react';
import { useForm, type DefaultValues, type FieldValues, type SubmitErrorHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

/**
 * React Hook Form + Zod : validation à la soumission, puis à chaque saisie une fois le champ touché.
 * `handleSubmit` est verrouillé : tant qu'un envoi est en cours (promesse retournée par le
 * callback), toute nouvelle soumission est ignorée — prévention des doubles envois.
 */
export function useZodForm<S extends z.ZodTypeAny>(schema: S, defaultValues: z.input<S>) {
  const form = useForm<z.input<S>, unknown, z.output<S>>({
    resolver: zodResolver(schema as never) as never,
    defaultValues: defaultValues as DefaultValues<z.input<S>>,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });
  const locked = useRef(false);

  const handleSubmit = (
    onValid: (values: z.output<S>) => unknown,
    onInvalid?: SubmitErrorHandler<FieldValues>,
  ) =>
    form.handleSubmit(async values => {
      if (locked.current) return;
      locked.current = true;
      try {
        await onValid(values);
      } finally {
        locked.current = false;
      }
    }, onInvalid as never);

  return { ...form, handleSubmit };
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Code de suivi du demandeur, lu dans l'en-tête `x-tracking-code` (jamais dans l'URL). */
export const TrackingCode = createParamDecorator(
  (_d: unknown, ctx: ExecutionContext): string | undefined => {
    const v = ctx.switchToHttp().getRequest().headers['x-tracking-code'];
    return typeof v === 'string' ? v.trim() : undefined;
  },
);

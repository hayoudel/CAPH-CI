import { forwardRef, type ReactNode } from 'react';

const ICON = { error: '!', success: '✓', info: 'i' } as const;

interface AlertProps { kind: keyof typeof ICON; title?: string; children?: ReactNode }

/** Les erreurs sont annoncées aussitôt (role="alert") ; les confirmations et informations poliment (role="status"). */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert({ kind, title, children }, ref) {
  return (
    <div ref={ref} tabIndex={-1} className={`alert alert--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span className="alert__icon" aria-hidden="true">{ICON[kind]}</span>
      <div className="alert__body">
        {title && <p className="alert__title">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
});

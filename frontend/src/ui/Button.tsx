import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const cls = (v: Variant, block?: boolean) => `btn btn--${v}${block ? ' btn--block' : ''}`;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; block?: boolean; loading?: boolean }

/** Pendant un envoi, le bouton reste actif pour les lecteurs d'écran mais ignore les clics multiples. */
export function Button({ variant = 'primary', block, loading, children, onClick, type = 'button', className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest} type={type} className={className ? `${cls(variant, block)} ${className}` : cls(variant, block)} aria-busy={loading || undefined}
      aria-disabled={loading || rest.disabled || undefined}
      onClick={(e) => { if (loading) { e.preventDefault(); return; } onClick?.(e); }}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function LinkButton({ variant = 'primary', block, ...rest }: LinkProps & { variant?: Variant; block?: boolean }) {
  return <Link {...rest} className={cls(variant, block)} />;
}

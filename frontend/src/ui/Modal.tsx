import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Le fond = le conteneur lui-même ou le voile assombri (jamais la boîte ni son contenu). */
const isBackdrop = (e: { target: EventTarget; currentTarget: EventTarget }) =>
  e.target === e.currentTarget || (e.target as HTMLElement).classList?.contains('modal__scrim');

/**
 * Fenêtre modale accessible : le focus y entre (sur le titre), reste prisonnier à l'intérieur tant qu'elle est ouverte,
 * Échap, la croix (×) et un clic sur le fond assombri la ferment, et le focus revient au bouton qui l'a ouverte.
 * Le clic extérieur ne ferme que s'il commence ET finit sur le fond : sélectionner du texte dans un champ et relâcher
 * la souris à côté ne fait donc pas perdre la saisie.
 * `size` : « lg » pour les longs formulaires (projet, actualité).
 */
export function Modal({ title, onClose, children, size = 'md' }: { title: string; onClose: () => void; children: ReactNode; size?: 'md' | 'lg' }) {
  const downOnBackdrop = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const titleId = useId();

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    heading.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close.current(); return; }
      if (e.key !== 'Tab' || !box.current) return;
      const items = Array.from(box.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === heading.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className="modal"
      onMouseDown={(e) => { downOnBackdrop.current = isBackdrop(e); }}
      onClick={(e) => { if (downOnBackdrop.current && isBackdrop(e)) close.current(); downOnBackdrop.current = false; }}
    >
      <div className="modal__scrim" aria-hidden="true" />
      <div ref={box} className={`modal__box modal__box--${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal__head">
          <h2 id={titleId} ref={heading} tabIndex={-1}>{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer la fenêtre">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" /></svg>
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

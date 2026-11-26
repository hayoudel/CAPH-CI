
import { useCallback, useEffect, useRef, useState } from 'react';

export default function useCardReader() {
  const [enabled, setEnabled] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentElement = useRef<HTMLElement | null>(null);

  // Arrêter toute lecture en cours
  const stopReading = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    currentElement.current = null;
  }, []);

  // Activer ou désactiver le mode lecture
  const toggleReading = useCallback(() => {
    setEnabled(current => !current);
  }, []);

  // Lire le contenu d'un élément
  const readCard = useCallback((element: HTMLElement) => {
    if (!enabled || !element) return;

    // Ne pas relire le même élément
    if (currentElement.current === element) return;

    stopReading();

    currentElement.current = element;

    timerRef.current = setTimeout(() => {
      if (!enabled || currentElement.current !== element) return;

      const text = element.innerText.trim();

      if (!text) return;

      const utterance = new SpeechSynthesisUtterance(text);

      utterance.lang = 'fr-FR';
      utterance.rate = 1;
      utterance.pitch = 1;

      window.speechSynthesis.speak(utterance);
    }, 500);
  }, [enabled, stopReading]);

  // Arrêter automatiquement la lecture lorsque le mode est désactivé
  useEffect(() => {
    if (!enabled) {
      stopReading();
    }
  }, [enabled, stopReading]);

  // Nettoyage à la destruction du composant
  useEffect(() => {
    return () => stopReading();
  }, [stopReading]);

  return {
    enabled,
    toggleReading,
    readCard,
    stopReading,
  };
}

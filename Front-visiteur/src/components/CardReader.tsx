
import { useEffect } from 'react';

interface CardReaderProps {
  enabled: boolean;
  readCard: (element: HTMLElement) => void;
  stopReading: () => void;
}

export default function CardReader({
  enabled,
  readCard,
  stopReading,
}: CardReaderProps) {
  useEffect(() => {
    const main = document.querySelector<HTMLElement>('#main-content');

    if (!main || !enabled) {
      stopReading();
      return;
    }

    const selector = [
      'article',
      'section',
      'div',
      'li',
      'a',
      'button',
      '[role="article"]',
      '[role="listitem"]',
      '.card',
      '[class*="card"]',
    ].join(',');

    const findReadableElement = (
      target: EventTarget | null
    ): HTMLElement | null => {
      if (!(target instanceof Element)) return null;

      const element = target.closest<HTMLElement>(selector);

      if (!element || !main.contains(element)) return null;

      return element;
    };

    const handleMouseOver: EventListener = (event) => {
      const mouseEvent = event as MouseEvent;
      const element = findReadableElement(mouseEvent.target);

      if (element) {
        readCard(element);
      } else {
        stopReading();
      }
    };

    const handleMouseOut: EventListener = (event) => {
      const mouseEvent = event as MouseEvent;
      const currentElement = findReadableElement(mouseEvent.target);

      if (!currentElement) return;

      const related = mouseEvent.relatedTarget;

      // La souris reste dans le même élément
      if (
        related instanceof Node &&
        currentElement.contains(related)
      ) {
        return;
      }

      // La souris passe vers un autre élément lisible
      if (findReadableElement(related)) {
        return;
      }

      stopReading();
    };

    main.addEventListener('mouseover', handleMouseOver);
    main.addEventListener('mouseout', handleMouseOut);

    return () => {
      main.removeEventListener('mouseover', handleMouseOver);
      main.removeEventListener('mouseout', handleMouseOut);
      stopReading();
    };
  }, [enabled, readCard, stopReading]);

  return null;
}

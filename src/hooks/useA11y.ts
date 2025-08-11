import { useRef, useEffect } from 'react';

/**
 * Hook para gerenciar foco e navegação por teclado
 */
export function useFocusManagement() {
  const focusTrapRef = useRef<HTMLElement>(null);

  /**
   * Define foco no primeiro elemento focável
   */
  const focusFirst = () => {
    const firstFocusable = getFocusableElements(focusTrapRef.current)[0];
    if (firstFocusable) {
      firstFocusable.focus();
    }
  };

  /**
   * Gerencia trap de foco para modais e overlays
   */
  const trapFocus = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const focusableElements = getFocusableElements(focusTrapRef.current);
    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };

  return {
    focusTrapRef,
    focusFirst,
    trapFocus
  };
}

/**
 * Hook para anúncios de screen reader
 */
export function useScreenReader() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.setAttribute('class', 'sr-only');
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove após 1 segundo
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  return { announce };
}

/**
 * Hook para navegação por teclado em listas
 */
export function useKeyboardNavigation(
  itemCount: number,
  onSelect?: (index: number) => void
) {
  const currentIndex = useRef(0);
  const listRef = useRef<HTMLElement>(null);

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        currentIndex.current = Math.min(currentIndex.current + 1, itemCount - 1);
        updateFocus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        currentIndex.current = Math.max(currentIndex.current - 1, 0);
        updateFocus();
        break;
      case 'Home':
        e.preventDefault();
        currentIndex.current = 0;
        updateFocus();
        break;
      case 'End':
        e.preventDefault();
        currentIndex.current = itemCount - 1;
        updateFocus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (onSelect) {
          onSelect(currentIndex.current);
        }
        break;
      case 'Escape':
        if (listRef.current) {
          listRef.current.blur();
        }
        break;
    }
  };

  const updateFocus = () => {
    const items = listRef.current?.querySelectorAll('[role="option"], button, [tabindex]');
    const targetItem = items?.[currentIndex.current] as HTMLElement;
    if (targetItem) {
      targetItem.focus();
    }
  };

  return {
    listRef,
    handleKeyDown,
    currentIndex: currentIndex.current
  };
}

/**
 * Obtém todos os elementos focáveis dentro de um container
 */
function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];

  const focusableSelectors = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]'
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
}

/**
 * Hook para detectar preferência de movimento reduzido
 */
export function usePrefersReducedMotion() {
  const prefersReducedMotion = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return prefersReducedMotion;
}

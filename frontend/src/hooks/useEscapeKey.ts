import { useEffect } from 'react';

/**
 * Hook to execute a callback when the Escape (ESC) key is pressed while the modal is open.
 */
export function useEscapeKey(isOpen: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        onEscape();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onEscape]);
}
export default useEscapeKey;

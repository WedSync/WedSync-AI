import { useEffect } from 'react';

interface KeyboardShortcuts {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Create a key combination string
      const key = [];
      if (event.ctrlKey || event.metaKey) key.push('ctrl');
      if (event.shiftKey) key.push('shift');
      if (event.altKey) key.push('alt');
      key.push(event.key.toLowerCase());

      const keyCombo = key.join('+');

      // Check if we have a handler for this combination
      if (shortcuts[keyCombo]) {
        event.preventDefault();
        shortcuts[keyCombo]();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

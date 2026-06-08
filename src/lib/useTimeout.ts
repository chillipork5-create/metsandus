import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Safe setTimeout that auto-clears on unmount.
 */
export function useTimeout() {
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (ref.current !== null) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  }, []);

  const set = useCallback((fn: () => void, delay: number) => {
    clear();
    ref.current = setTimeout(() => {
      ref.current = null;
      fn();
    }, delay);
  }, [clear]);

  useEffect(() => clear, [clear]);

  return { set, clear };
}

/**
 * Boolean flag that resets to false after `delay` ms.
 * Used for "Salvestatud!" flash on save buttons.
 */
export function useFlash(delay = 2000): [boolean, () => void] {
  const [active, setActive] = useState(false);
  const { set } = useTimeout();

  const flash = useCallback(() => {
    setActive(true);
    set(() => setActive(false), delay);
  }, [set, delay]);

  return [active, flash];
}

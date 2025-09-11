import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {},
): [React.RefObject<HTMLElement>, boolean, IntersectionObserverEntry?] {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0%',
    freezeOnceVisible = false,
  } = options;

  const elementRef = useRef<HTMLElement>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const [isIntersecting, setIsIntersecting] = useState(false);

  const frozen = entry?.isIntersecting && freezeOnceVisible;

  const updateEntry = ([entry]: IntersectionObserverEntry[]): void => {
    setEntry(entry);
    setIsIntersecting(entry.isIntersecting);
  };

  useEffect(() => {
    const node = elementRef.current; // DOM node
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || frozen || !node) return;

    const observerParams = { threshold, root, rootMargin };
    const observer = new IntersectionObserver(updateEntry, observerParams);

    observer.observe(node);

    return () => observer.disconnect();
  }, [elementRef.current, JSON.stringify(threshold), root, rootMargin, frozen]);

  return [elementRef, isIntersecting, entry];
}

// Advanced intersection observer with performance optimizations
export function useAdvancedIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {},
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Set<Element>>(new Set());

  const observe = (element: Element) => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(callback, options);
    }

    if (!elementsRef.current.has(element)) {
      observerRef.current.observe(element);
      elementsRef.current.add(element);
    }
  };

  const unobserve = (element: Element) => {
    if (observerRef.current && elementsRef.current.has(element)) {
      observerRef.current.unobserve(element);
      elementsRef.current.delete(element);
    }
  };

  const disconnect = () => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      elementsRef.current.clear();
    }
  };

  useEffect(() => {
    return () => disconnect();
  }, []);

  return { observe, unobserve, disconnect };
}

export default useIntersectionObserver;

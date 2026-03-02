import { useEffect, useRef } from 'react';

interface Props {
  onVisible: () => void;
  enabled: boolean;
}

export function InfiniteScrollSentinel({ onVisible, enabled }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible();
      },
      { rootMargin: '200px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onVisible, enabled]);

  return <div ref={ref} className="load-more-sentinel" aria-hidden="true" />;
}

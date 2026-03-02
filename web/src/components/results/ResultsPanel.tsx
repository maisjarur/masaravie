import { useState, useMemo } from 'react';
import { useSearch } from '../../hooks/useSearch';
import { FilterBar } from './FilterBar';
import { SkeletonCard } from './SkeletonCard';
import { ProviderCard } from './ProviderCard';
import { InfiniteScrollSentinel } from './InfiniteScrollSentinel';
import { MapView } from './MapView';
import type { SearchParams } from '../../types/search';

interface ResultsPanelProps {
  searchParams: SearchParams | null;
  searchEnabled: boolean;
}

export function ResultsPanel({ searchParams, searchEnabled }: ResultsPanelProps) {
  const [nameFilter, setNameFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [view, setView] = useState<'list' | 'map'>('list');

  const isQueryEnabled = searchEnabled && searchParams !== null;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useSearch(searchParams ?? { location: '', services: [], onlineOnly: false }, isQueryEnabled);

  const allProviders = useMemo(
    () => data?.pages.flatMap((p) => p.providers) ?? [],
    [data]
  );

  const filtered = useMemo(() => {
    let result = allProviders;
    if (nameFilter) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }
    const minRating = parseFloat(ratingFilter) || 0;
    if (minRating) {
      result = result.filter(
        (p) => typeof p.rating === 'number' && p.rating >= minRating
      );
    }
    return result;
  }, [allProviders, nameFilter, ratingFilter]);

  return (
    <section className="results-panel">
      <FilterBar
        nameFilter={nameFilter}
        ratingFilter={ratingFilter}
        view={view}
        count={filtered.length}
        total={allProviders.length}
        onNameChange={setNameFilter}
        onRatingChange={setRatingFilter}
        onViewChange={setView}
      />

      {view === 'list' && (
        <>
          <ul className="card-list">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : filtered.length === 0 && isQueryEnabled
              ? (
                <li className="empty-state">
                  No providers found. Try broadening your search.
                </li>
              )
              : filtered.map((p) => <ProviderCard key={p.id} provider={p} />)
            }
          </ul>
          {isFetchingNextPage && (
            <div className="load-more-sentinel">
              <div
                className="load-more-spinner"
                role="status"
                aria-label="Loading more results"
              />
            </div>
          )}
          <InfiniteScrollSentinel
            onVisible={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
            enabled={!!hasNextPage && !isFetchingNextPage}
          />
        </>
      )}

      {view === 'map' && <MapView providers={filtered} />}
    </section>
  );
}

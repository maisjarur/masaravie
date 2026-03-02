interface FilterBarProps {
  nameFilter: string;
  ratingFilter: string;
  view: 'list' | 'map';
  count: number;
  total: number;
  onNameChange: (v: string) => void;
  onRatingChange: (v: string) => void;
  onViewChange: (v: 'list' | 'map') => void;
}

export function FilterBar({
  nameFilter,
  ratingFilter,
  view,
  count,
  total,
  onNameChange,
  onRatingChange,
  onViewChange,
}: FilterBarProps) {
  const filterCountText =
    count > 0
      ? `${count} of ${total}`
      : total > 0
      ? '0 results'
      : '';

  return (
    <div className="results-filter-bar">
      <input
        type="text"
        placeholder="Filter by name…"
        value={nameFilter}
        onChange={(e) => onNameChange(e.target.value)}
        aria-label="Filter by name"
      />
      <select
        value={ratingFilter}
        onChange={(e) => onRatingChange(e.target.value)}
        aria-label="Filter by rating"
      >
        <option value="">All ratings</option>
        <option value="4">4+ ★</option>
        <option value="4.5">4.5+ ★</option>
        <option value="5">5 ★</option>
      </select>
      {filterCountText && (
        <span className="filter-count">{filterCountText}</span>
      )}
      <div className="view-toggle" role="group" aria-label="Results view">
        <button
          type="button"
          className={`view-toggle-btn${view === 'list' ? ' active' : ''}`}
          aria-pressed={view === 'list'}
          onClick={() => onViewChange('list')}
        >
          List
        </button>
        <button
          type="button"
          className={`view-toggle-btn${view === 'map' ? ' active' : ''}`}
          aria-pressed={view === 'map'}
          onClick={() => onViewChange('map')}
        >
          Map
        </button>
      </div>
    </div>
  );
}

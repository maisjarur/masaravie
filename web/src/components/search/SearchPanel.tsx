import { useState } from 'react';
import { LocationInput } from './LocationInput';
import { ServiceChips } from './ServiceChips';
import type { SearchParams } from '../../types/search';

interface SearchPanelProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
  status: string;
  isError: boolean;
}

export function SearchPanel({ onSearch, loading, status, isError }: SearchPanelProps) {
  const [location, setLocation] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  function handleSearch() {
    onSearch({ location, services: selectedServices, onlineOnly });
  }

  return (
    <section className="search-panel">
      <div className="search-col">
        <LocationInput
          value={location}
          onChange={setLocation}
          onSearch={handleSearch}
        />
        <label className="toggle-group">
          <input
            type="checkbox"
            checked={onlineOnly}
            onChange={(e) => setOnlineOnly(e.target.checked)}
          />
          Online only
        </label>
      </div>

      <div className="search-col search-col--chips">
        <span className="field-label">Focus</span>
        <ServiceChips selected={selectedServices} onChange={setSelectedServices} />
      </div>

      <div className="search-col search-col--action">
        <button
          type="button"
          className="primary-button"
          onClick={handleSearch}
          disabled={loading}
        >
          Search
        </button>
        {status && (
          <span className={`status-text${isError ? ' error' : ''}`}>
            {status}
          </span>
        )}
      </div>
    </section>
  );
}

import { useState, useRef, useCallback, useId } from 'react';
import { useLocationAutocomplete } from '../../hooks/useLocationAutocomplete';
import { useGeolocation } from '../../hooks/useGeolocation';
import type { LocationSuggestion } from '../../types/search';

interface LocationInputProps {
  value: string;
  onChange: (v: string) => void;
  onSearch: () => void;
}

export function LocationInput({ value, onChange, onSearch }: LocationInputProps) {
  const listboxId = useId();
  const { suggestions, search, clear } = useLocationAutocomplete();
  const { detect, loading: geoLoading } = useGeolocation();
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = open && suggestions.length > 0;

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    setHighlightIndex(-1);
    if (v.trim().length >= 3) {
      setOpen(true);
      search(v);
    } else {
      setOpen(false);
      clear();
    }
  }

  function handleFocus() {
    if (value.trim().length >= 3) {
      setOpen(true);
      search(value);
    }
  }

  function selectSuggestion(s: LocationSuggestion) {
    onChange(s.label);
    setOpen(false);
    clear();
    setHighlightIndex(-1);
    inputRef.current?.focus();
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === 'Enter') onSearch();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightIndex >= 0 && suggestions[highlightIndex]) {
          selectSuggestion(suggestions[highlightIndex]);
        } else {
          setOpen(false);
          onSearch();
        }
      } else if (e.key === 'Escape') {
        setOpen(false);
        setHighlightIndex(-1);
      }
    },
    [isOpen, highlightIndex, suggestions, onSearch]
  );

  async function handleUseLocation() {
    const label = await detect();
    if (label) {
      onChange(label);
      setOpen(false);
      clear();
    }
  }

  function handleBlur(e: React.FocusEvent) {
    // Close dropdown when focus leaves the component entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setOpen(false);
      setHighlightIndex(-1);
    }
  }

  const activeDescendant =
    isOpen && highlightIndex >= 0
      ? `${listboxId}-option-${highlightIndex}`
      : undefined;

  return (
    <div className="field-group">
      <label htmlFor="location-input">Location</label>
      <div className="location-row">
        <div className="location-autocomplete" onBlur={handleBlur}>
          <input
            ref={inputRef}
            id="location-input"
            type="text"
            autoComplete="off"
            placeholder="City, country (e.g. London, UK)"
            value={value}
            onChange={handleInput}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-activedescendant={activeDescendant}
          />
          {isOpen && (
            <ul
              id={listboxId}
              className="location-suggestions"
              role="listbox"
              aria-label="Location suggestions"
            >
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  id={`${listboxId}-option-${i}`}
                  role="option"
                  aria-selected={i === highlightIndex}
                  className={`location-option${i === highlightIndex ? ' highlighted' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(s);
                  }}
                >
                  {s.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={handleUseLocation}
          disabled={geoLoading}
        >
          {geoLoading ? 'Detecting…' : 'Use my location'}
        </button>
      </div>
    </div>
  );
}

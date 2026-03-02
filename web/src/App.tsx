import { useState } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { SearchPanel } from './components/search/SearchPanel';
import { ResultsPanel } from './components/results/ResultsPanel';
import { ContactSection } from './components/contact/ContactSection';
import type { SearchParams } from './types/search';

export default function App() {
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);

  function handleSearch(params: SearchParams) {
    setSearchParams(params);
    setSearchEnabled(true);
    setStatus('Gathering spaces and events...');
    setIsError(false);
  }

  return (
    <div className="app-shell">
      <Header />
      <main className="main">
        <SearchPanel
          onSearch={handleSearch}
          loading={searchEnabled && !searchParams}
          status={status}
          isError={isError}
        />
        <section className="ad-slot" aria-label="Advertisement">
          <div className="ad-placeholder"><span>Advertisement</span></div>
        </section>
        <ResultsPanel searchParams={searchParams} searchEnabled={searchEnabled} />
      </main>
      <ContactSection />
      <Footer />
    </div>
  );
}

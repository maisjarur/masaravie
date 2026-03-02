import type { Provider } from '../../types/provider';

function safeHttpsUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

interface ProviderCardProps {
  provider: Provider;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  const { name, rating, reviewCount, services, location, online, raw } = provider;

  const locationLabel =
    location?.address ||
    [location?.city, location?.country].filter(Boolean).join(', ') ||
    (online ? 'Online' : '');

  const servicesLabel = services && services.length ? services.join(' · ') : '';

  const safeUrl = safeHttpsUrl(raw?.url);

  return (
    <article className="card">
      <div className="card-header">
        <h3>{name || 'Unknown space'}</h3>
        <div className="card-header-right">
          {typeof rating === 'number' && (
            <span className="rating">{rating.toFixed(1)} ★</span>
          )}
          {typeof reviewCount === 'number' && (
            <span className="reviews">({reviewCount.toLocaleString()})</span>
          )}
        </div>
      </div>
      <div className="card-body">
        {locationLabel && (
          <p className="location">{locationLabel}</p>
        )}
        {servicesLabel && (
          <p className="services">
            Focus: <span>{servicesLabel}</span>
          </p>
        )}
        {safeUrl && (
          <div className="link-row">
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pill-link"
            >
              View on Maps
            </a>
          </div>
        )}
      </div>
    </article>
  );
}

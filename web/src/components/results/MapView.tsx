import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet';
import type { Provider } from '../../types/provider';

// Fix Leaflet's default icon broken image issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: '', iconUrl: '', shadowUrl: '' });

function safeHttpsUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

interface MapBoundsFitterProps {
  providers: Provider[];
}

function MapBoundsFitter({ providers }: MapBoundsFitterProps) {
  const map = useMap();

  useEffect(() => {
    const withCoords = providers.filter(
      (p) => p.location?.lat != null && p.location?.lng != null
    );

    if (!withCoords.length) {
      map.setView([20, 0], 2);
      return;
    }

    const bounds = withCoords.map(
      (p) => [p.location.lat!, p.location.lng!] as [number, number]
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [providers, map]);

  return null;
}

interface MapViewProps {
  providers: Provider[];
}

export function MapView({ providers }: MapViewProps) {
  const withCoords = providers.filter(
    (p) => p.location?.lat != null && p.location?.lng != null
  );

  return (
    <MapContainer
      className="map-container"
      center={[20, 0]}
      zoom={2}
      style={{ width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <MapBoundsFitter providers={providers} />
      {withCoords.map((provider) => {
        const lat = provider.location.lat!;
        const lng = provider.location.lng!;
        const rating =
          typeof provider.rating === 'number'
            ? provider.rating.toFixed(1) + ' ★'
            : '';
        const addr = provider.location.address || '';
        const safeUrl = safeHttpsUrl(provider.raw?.url);

        return (
          <CircleMarker
            key={provider.id}
            center={[lat, lng]}
            radius={9}
            pathOptions={{
              fillColor: '#c18c5b',
              color: '#ffffff',
              weight: 2,
              fillOpacity: 0.9,
            }}
          >
            <Tooltip
              className="map-dot-tooltip"
              sticky={false}
              direction="top"
              offset={[0, -8]}
            >
              <div className="map-tooltip">
                <strong className="map-tooltip-name">
                  {provider.name || 'Unknown space'}
                </strong>
                {rating && (
                  <span className="map-tooltip-rating">{rating}</span>
                )}
                {addr && (
                  <span className="map-tooltip-addr">{addr}</span>
                )}
              </div>
            </Tooltip>
            <Popup className="map-dot-popup">
              <div className="map-popup">
                <strong className="map-popup-name">
                  {provider.name || 'Unknown space'}
                </strong>
                {rating && (
                  <div className="map-popup-rating">{rating}</div>
                )}
                {addr && (
                  <div className="map-popup-addr">{addr}</div>
                )}
                {safeUrl && (
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="map-popup-link"
                  >
                    View on Maps ↗
                  </a>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

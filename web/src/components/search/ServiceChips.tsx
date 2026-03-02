const SERVICE_CATEGORIES = [
  'yoga',
  'meditation',
  'breathwork',
  'healing',
  'ecstatic dance',
  'massage',
  'sound bath',
  'mystery school',
  'self development',
  'ayerveda',
  'holistic nutrition',
  'conscious living',
  'mental health',
  'spiritual coaching',
  'energy work',
  'reiki',
  'shamanic healing',
  'tarot',
  'astrology',
  'vipassana meditation',
  'art therapy',
  'DMT',
] as const;

interface ServiceChipsProps {
  selected: string[];
  onChange: (services: string[]) => void;
}

export function ServiceChips({ selected, onChange }: ServiceChipsProps) {
  function toggle(service: string) {
    if (selected.includes(service)) {
      onChange(selected.filter((s) => s !== service));
    } else {
      onChange([...selected, service]);
    }
  }

  return (
    <div className="chips">
      {SERVICE_CATEGORIES.map((service) => (
        <label key={service} className="chip">
          <input
            type="checkbox"
            value={service}
            checked={selected.includes(service)}
            onChange={() => toggle(service)}
          />
          <span>
            {service.charAt(0).toUpperCase() + service.slice(1)}
          </span>
        </label>
      ))}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { City, CityIndex } from '../lib/places/index';

export function PlaceSearch({ index, onPick, placeholder = 'Type a city', autoFocus = true }: {
  index: CityIndex | null; onPick: (c: City) => void; placeholder?: string; autoFocus?: boolean;
}) {
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) input.current?.focus(); }, [autoFocus]);
  const results = index && q.trim().length >= 2 ? index.search(q) : [];
  return (
    <div className="search">
      <input
        ref={input} value={q} onChange={e => setQ(e.target.value)} placeholder={index ? placeholder : 'Loading cities…'}
        disabled={!index} autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" aria-label="Search for a city"
        onKeyDown={e => { if (e.key === 'Enter' && results[0]) { onPick(results[0]); setQ(''); } }}
      />
      {results.length > 0 && (
        <ul className="results" role="listbox">
          {results.map(c => (
            <li key={c.id}>
              <button type="button" onClick={() => { onPick(c); setQ(''); }}>
                <span className="city">{c.name}</span> <span className="country">{c.country}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {index && q.trim().length >= 2 && results.length === 0 && <p className="hint">No match yet. Try the nearest bigger city.</p>}
    </div>
  );
}

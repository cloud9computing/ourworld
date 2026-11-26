import { useState } from 'react';
import { LIST_MAX } from '../data/bank';
import { copy } from '../data/copy';
import type { City, CityIndex } from '../lib/places/index';
import { PlaceSearch } from '../components/PlaceSearch';

/** The two optional list questions (F5): type or paste places; pasted ones are confirmed with one tap each. */
export function ListQuestion({ title, hint, step, index, initial, placesSoFar, onDone, onBack }: {
  title: string; hint: string; step: string; index: CityIndex | null; initial: number[]; placesSoFar: number;
  onDone: (ids: number[]) => void; onBack: () => void;
}) {
  const [ids, setIds] = useState<number[]>(initial);
  const [pending, setPending] = useState<City[]>([]);
  const [paste, setPaste] = useState('');
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const add = (cs: City[]) => setIds(prev => [...prev, ...cs.map(c => c.id).filter(id => !prev.includes(id))].slice(0, LIST_MAX));
  const cities = ids.map(id => index?.byId.get(id)).filter((c): c is City => !!c);
  const full = ids.length >= LIST_MAX;
  return (
    <main className="screen">
      <div className="topbar"><button className="link" onClick={onBack}>← Back</button><span className="meta">{copy.progress(placesSoFar)}</span></div>
      <p className="eyebrow">{step}</p>
      <h2 className="question">{title}</h2>
      <p className="hint">{hint}</p>
      {!full && <PlaceSearch index={index} onPick={c => add([c])} autoFocus={false} />}
      <details className="paste">
        <summary>Paste a list instead</summary>
        <textarea value={paste} onChange={e => setPaste(e.target.value)} placeholder="Goa, Langkawi, Vienna" rows={3} aria-label="Paste a list of places" />
        <button className="secondary" disabled={!index || !paste.trim()} onClick={() => {
          const r = index!.parseList(paste);
          setPending(r.matched.filter(c => !ids.includes(c.id))); setUnmatched(r.unmatched); setPaste('');
        }}>Find these</button>
      </details>
      {pending.length > 0 && (
        <div className="named">
          <p className="eyebrow">Tap to confirm</p>
          <div className="chips">
            {pending.map(c => (
              <button key={c.id} className="chip" onClick={() => { add([c]); setPending(pending.filter(p => p.id !== c.id)); }}>{c.name}, {c.country} ✓</button>
            ))}
            <button className="chip on" onClick={() => { add(pending); setPending([]); }}>Add all</button>
          </div>
        </div>
      )}
      {unmatched.length > 0 && <p className="hint">Couldn’t find {unmatched.map(u => `“${u}”`).join(', ')}. Try another spelling or the nearest bigger city.</p>}
      {cities.length > 0 && (
        <div className="chips">
          {cities.map(c => <button key={c.id} className="chip on" onClick={() => setIds(ids.filter(i => i !== c.id))} aria-label={`Remove ${c.name}`}>{c.name} ×</button>)}
        </div>
      )}
      {full && <p className="hint">That’s {LIST_MAX}, the most that fits in your code.</p>}
      <button className="primary" onClick={() => onDone(ids)}>{ids.length ? 'Done' : 'Skip'}</button>
    </main>
  );
}

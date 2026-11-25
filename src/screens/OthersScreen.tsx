import { useState } from 'react';
import { OTHERS, OTHERS_MAX } from '../data/questions';
import { copy } from '../data/copy';
import type { City, CityIndex } from '../lib/places/index';
import { PlaceSearch } from '../components/PlaceSearch';

export function OthersScreen({ index, initial, placesSoFar, onDone, onBack }: {
  index: CityIndex | null; initial: number[]; placesSoFar: number; onDone: (ids: number[]) => void; onBack: () => void;
}) {
  const [ids, setIds] = useState<number[]>(initial);
  const [paste, setPaste] = useState('');
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const add = (cs: City[]) => setIds(prev => [...prev, ...cs.map(c => c.id).filter(id => !prev.includes(id))].slice(0, OTHERS_MAX));
  const cities = ids.map(id => index?.byId.get(id)).filter((c): c is City => !!c);
  return (
    <main className="screen">
      <div className="topbar"><button className="link" onClick={onBack}>← Back</button><span className="progress">{copy.progress(placesSoFar + ids.filter(id => !initial.includes(id)).length)}</span></div>
      <p className="eyebrow">Last one</p>
      <h2 className="question">{OTHERS.prompt}</h2>
      <p className="hint">{OTHERS.hint}</p>
      <PlaceSearch index={index} onPick={c => add([c])} autoFocus={false} />
      <details className="paste">
        <summary>Paste a list instead</summary>
        <textarea value={paste} onChange={e => setPaste(e.target.value)} placeholder="Goa, Langkawi, Vienna" rows={3} />
        <button className="secondary" disabled={!index || !paste.trim()} onClick={() => {
          const r = index!.parseList(paste); add(r.matched); setUnmatched(r.unmatched); setPaste('');
        }}>Add these</button>
        {unmatched.length > 0 && <p className="hint">Couldn’t find {unmatched.map(u => `“${u}”`).join(', ')}. Try another spelling or the nearest bigger city.</p>}
      </details>
      {cities.length > 0 && (
        <div className="chips">
          {cities.map(c => <button key={c.id} className="chip on" onClick={() => setIds(ids.filter(i => i !== c.id))} aria-label={`Remove ${c.name}`}>{c.name} ×</button>)}
        </div>
      )}
      {ids.length >= OTHERS_MAX && <p className="hint">That’s the most we can fit in your code.</p>}
      <button className="primary" onClick={() => onDone(ids)}>{ids.length ? 'Done' : 'Skip'}</button>
    </main>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { copy } from '../data/copy';
import { buildWorld } from '../lib/shape/world';
import { Chart } from '../components/Chart';
import type { Person } from '../state/people';

/** F13: dim, "This is your world", the two silver shapes slide together, then the pink shape draws itself. */
export function Final({ a, b, land, continentOf, toExplore, onPoster }: {
  a: Person; b: Person; land: ArrayLike<number>; continentOf: (cc: string) => string; toExplore: number; onPoster: () => void;
}) {
  const model = useMemo(() => buildWorld(a.places, b.places, continentOf), [a, b, continentOf]);
  const [phase, setPhase] = useState<'dim' | 'title' | 'merge' | 'draw' | 'done'>('dim');
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase('title'), 1000);
    const t2 = window.setTimeout(() => setPhase('merge'), 2000);
    const t3 = window.setTimeout(() => setPhase('draw'), 3400);
    return () => { [t1, t2, t3].forEach(window.clearTimeout); };
  }, []);
  useEffect(() => {
    if (phase !== 'draw') return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 3000);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick); else setPhase('done');
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  return (
    <main className={`screen final ${phase}`}>
      <h2 className="display center final-title">{copy.thisIsYourWorld}</h2>
      <div className="final-stage">
        <Chart className="final-a" model={model} land={land} mode="a" view={model.view} dreams={false} label={copy.yourWorld(a.name)} />
        <Chart className="final-b" model={model} land={land} mode="b" view={model.view} dreams={false} label={copy.yourWorld(b.name)} />
        {(phase === 'draw' || phase === 'done') && (
          <Chart className="final-ours" model={model} land={land} mode="ours" view={model.view} progress={progress} dreams={phase === 'done'} label={copy.altText(model.counts.places, toExplore)} />
        )}
      </div>
      <div className="final-counts center">
        {toExplore > 0
          ? <><p className="final-share">{toExplore}</p><p className="meta">{copy.toExplore}</p></>
          : <p className="hint">{copy.exploredAll}</p>}
        <p className="hint">{copy.supportLine(model.counts.places, model.counts.countries, model.aroundWorld === null ? null : copy.aroundWorld(`${Math.round(model.aroundWorld * 100)}%`))}</p>
      </div>
      <button className="primary final-cta" onClick={onPoster} disabled={phase !== 'done'}>See your poster</button>
    </main>
  );
}

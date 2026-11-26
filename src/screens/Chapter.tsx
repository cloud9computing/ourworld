import { ACTS, type Act } from '../data/bank';
import { copy } from '../data/copy';
import type { WorldModel } from '../lib/shape/world';
import { Chart } from '../components/Chart';

export function Chapter({ act, model, land, onContinue }: { act: Act; model: WorldModel; land: ArrayLike<number> | null; onContinue: () => void }) {
  return (
    <main className="screen chapter" onClick={onContinue} role="button" tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onContinue()}>
      <div className="chapter-map">{land && <Chart model={model} land={land} mode="a" label="Your map so far" />}</div>
      <p className="eyebrow pink center">Act {act} of 3</p>
      <h2 className="display center">{ACTS[act].name}</h2>
      <p className="lede center">{ACTS[act].line}</p>
      <p className="meta center">{copy.tapToContinue}</p>
    </main>
  );
}

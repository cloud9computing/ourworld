import { ACT_LINES, ACT_NAMES, type Act, type Tier } from '../data/bank';
import { copy } from '../data/copy';
import type { WorldModel } from '../lib/shape/world';
import { Chart } from '../components/Chart';

export function Chapter({ act, tier, model, land, onContinue }: { act: Act; tier: Tier; model: WorldModel; land: ArrayLike<number> | null; onContinue: () => void }) {
  const name = ACT_NAMES[tier][act];
  return (
    <main className="screen chapter" onClick={onContinue} role="button" tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onContinue()}>
      <div className="chapter-map">{land && <Chart model={model} land={land} mode="a" label="Your map so far" />}</div>
      <p className="eyebrow pink center">Act {act} of 3</p>
      <h2 className="display center">{name}</h2>
      <p className="lede center">{ACT_LINES[name]}</p>
      <p className="meta center">{copy.tapToContinue}</p>
    </main>
  );
}

import { useMemo } from 'react';
import { copy } from '../data/copy';
import { buildWorld } from '../lib/shape/world';
import { SAMPLE_A, SAMPLE_B } from '../data/sample';
import { Chart } from '../components/Chart';

export type GameStatus = 'none' | 'playing' | 'finished';

/** The landing page; `share` is the share landing that a poster's link opens (/s), shorter and to the point. */
export function Landing({ land, status, share, onStart, onScanInvite, onContinue, onPoster, onClear }: {
  land: ArrayLike<number> | null; status: GameStatus; share?: boolean;
  onStart: () => void; onScanInvite: () => void; onContinue: () => void; onPoster: () => void; onClear: () => void;
}) {
  const model = useMemo(() => buildWorld({ name: 'A', visited: SAMPLE_A, dreams: [] }, { name: 'B', visited: SAMPLE_B, dreams: [] }), []);
  return (
    <main className="screen landing">
      <p className="eyebrow center">{copy.landingEyebrow}</p>
      <h1 className="display center landing-title">{copy.landingTitle}</h1>
      <div className="loop" aria-label="Two silver shapes slide together into one pink shape" role="img">
        {land && <>
          <Chart className="loop-a" model={model} land={land} mode="a" dreams={false} label="" />
          <Chart className="loop-b" model={model} land={land} mode="b" dreams={false} label="" />
          <Chart className="loop-ours" model={model} land={land} mode="ours" dreams={false} label="" />
        </>}
      </div>
      <p className="lede center">{share ? copy.shareLine : copy.landingLine}</p>
      {status === 'none' && <button className="primary" onClick={onStart}>{copy.landingStart}</button>}
      {status === 'playing' && <>
        <button className="primary" onClick={onContinue}>Continue our game</button>
        <button className="secondary" onClick={onStart}>Play again</button>
      </>}
      {status === 'finished' && <>
        <button className="primary" onClick={onPoster}>See our poster</button>
        <button className="secondary" onClick={onStart}>Play again</button>
      </>}
      <button className="link center" onClick={onScanInvite}>{copy.haveInvite}</button>
      {status !== 'none' && <button className="link center" onClick={onClear}>Clear this game</button>}
      <p className="fine center">Your answers stay on your phones. Nothing is sent to us. City data from GeoNames (CC BY 4.0), map from Natural Earth.</p>
    </main>
  );
}

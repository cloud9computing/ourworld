import { useMemo } from 'react';
import { copy } from '../data/copy';
import { buildWorld } from '../lib/shape/world';
import type { Place } from '../lib/shape/polygon';
import { Chart } from '../components/Chart';

// Sample journeys for the landing loop (made-up couple, not anyone's data).
const P = (id: number, name: string, lat: number, lon: number, cc: string): Place => ({ id, name, lat, lon, cc, admin: '' });
const SAMPLE_A = [P(1, 'Goa', 15.5, 73.83, 'IN'), P(2, 'Vienna', 48.21, 16.37, 'AT'), P(3, 'Seville', 37.39, -5.99, 'ES'), P(4, 'Portland', 45.52, -122.68, 'US'), P(5, 'Langkawi', 6.35, 99.8, 'MY')];
const SAMPLE_B = [P(1, 'Goa', 15.5, 73.83, 'IN'), P(6, 'Wayanad', 11.69, 76.08, 'IN'), P(7, 'Barcelona', 41.39, 2.17, 'ES'), P(8, 'Yellowstone', 44.46, -110.83, 'US'), P(9, 'Colombo', 6.93, 79.85, 'LK')];

export type GameStatus = 'none' | 'playing' | 'finished';

export function Landing({ land, status, onStart, onScanInvite, onContinue, onPoster, onClear }: {
  land: ArrayLike<number> | null; status: GameStatus;
  onStart: () => void; onScanInvite: () => void; onContinue: () => void; onPoster: () => void; onClear: () => void;
}) {
  const model = useMemo(() => buildWorld({ name: 'A', visited: SAMPLE_A, dreams: [] }, { name: 'B', visited: SAMPLE_B, dreams: [] }), []);
  return (
    <main className="screen landing">
      <p className="eyebrow center">{copy.landingEyebrow}</p>
      <h1 className="display center">{copy.landingTitle}</h1>
      <div className="loop" aria-label="Two silver shapes slide together into one pink shape" role="img">
        {land && <>
          <Chart className="loop-a" model={model} land={land} mode="a" dreams={false} label="" />
          <Chart className="loop-b" model={model} land={land} mode="b" dreams={false} label="" />
          <Chart className="loop-ours" model={model} land={land} mode="ours" dreams={false} label="" />
        </>}
      </div>
      <p className="lede center">{copy.landingLine}</p>
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

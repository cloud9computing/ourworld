import { useEffect, useMemo, useRef, useState } from 'react';
import { copy } from '../data/copy';
import { actName, questionText, type BankQuestion } from '../data/bank';
import type { City, CityIndex } from '../lib/places/index';
import type { WorldModel } from '../lib/shape/world';
import type { Answer } from '../lib/swap/codec';
import { PlaceSearch } from '../components/PlaceSearch';
import { Chart } from '../components/Chart';

export function Question({ q, partner, index, current, chips, uses, placesSoFar, model, land, newest, onAnswer, onBack }: {
  q: BankQuestion; partner: string; index: CityIndex | null; current?: Answer;
  chips: City[]; uses: Map<number, number>; placesSoFar: number;
  model: WorldModel; land: ArrayLike<number> | null; newest?: number;
  onAnswer: (a: Answer) => void; onBack?: () => void;
}) {
  const [picked, setPicked] = useState<City | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const choose = (c: City) => {
    setPicked(c);
    // a short pause so the choice registers, then on to the next question
    timer.current = window.setTimeout(() => onAnswer({ status: 'answered', place: c.id }), 650);
  };
  const chosen = picked ?? (current?.status === 'answered' && current.place ? index?.byId.get(current.place) : undefined);
  const text = useMemo(() => questionText(q, partner), [q, partner]);
  return (
    <main className="screen question-screen">
      <div className="topbar">
        <span className="act">{onBack && <button className="link inline" onClick={onBack} aria-label="Previous question">←</button>} Act {q.act} · {actName(q)}</span>
        <span className="act-dots" aria-hidden>{[1, 2, 3].map(a => <i key={a} className={a <= q.act ? 'on' : ''} />)}</span>
      </div>
      <div className="mini">
        {land ? <Chart model={model} land={land} mode="a" pulse={newest} label={`Your map so far: ${copy.progress(placesSoFar)}`} /> : <div className="chart-placeholder" />}
        <p className="meta center">{copy.progress(placesSoFar)}</p>
      </div>
      <h2 className="question">{text}</h2>
      {chosen ? (
        <p className="chosen"><strong>{chosen.name}</strong> <span>{chosen.country}</span></p>
      ) : null}
      {!picked && <PlaceSearch index={index} onPick={choose} />}
      {!picked && chips.length > 0 && (
        <div className="named">
          <p className="eyebrow">Already named</p>
          <div className="chips">
            {chips.map(c => {
              const tired = (uses.get(c.id) ?? 0) >= 2;
              return (
                <button key={c.id} className={`chip ${tired ? 'dim' : ''}`} onClick={() => choose(c)} title={tired ? copy.somewhereNew : undefined}>
                  {c.name}{tired && <span className="chip-note"> · {copy.somewhereNew}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="foot">
        <p className="hint center">{copy.partnerToo(partner)}</p>
        {!picked && <button className="link center underline" onClick={() => onAnswer({ status: 'skipped' })}>{copy.skip}</button>}
      </div>
    </main>
  );
}

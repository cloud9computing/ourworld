import { useState } from 'react';
import { copy } from '../data/copy';
import type { Question } from '../data/questions';
import type { City, CityIndex } from '../lib/places/index';
import { PlaceSearch } from '../components/PlaceSearch';
import type { Answer } from '../state/session';

export function QuestionScreen({ q, n, total, index, current, chips, uses, placesSoFar, onAnswer, onBack }: {
  q: Question; n: number; total: number; index: CityIndex | null; current?: Answer;
  chips: City[]; uses: Map<number, number>; placesSoFar: number;
  onAnswer: (a: Answer) => void; onBack?: () => void;
}) {
  const [pending, setPending] = useState<City | null>(null);
  const pick = (c: City) => {
    if ((uses.get(c.id) ?? 0) >= 2 && current?.place !== c.id) setPending(c);
    else onAnswer({ status: 'answered', place: c.id });
  };
  const chosen = current?.status === 'answered' && current.place ? index?.byId.get(current.place) : undefined;
  return (
    <main className="screen">
      <div className="topbar">
        {onBack ? <button className="link" onClick={onBack}>← Back</button> : <span />}
        <span className="progress">{copy.progress(placesSoFar)}</span>
      </div>
      <p className="eyebrow">{n} / {total}</p>
      <h2 className="question">{q.prompt}</h2>
      {q.hint && <p className="hint">{q.hint}</p>}
      {chosen && <p className="chosen">Your answer: <strong>{chosen.name}</strong>, {chosen.country}</p>}
      {pending ? (
        <div className="nudge">
          <p>{copy.repeatNudge(pending.name)}</p>
          <button className="primary" onClick={() => { onAnswer({ status: 'answered', place: pending.id }); setPending(null); }}>Keep {pending.name}</button>
          <button className="secondary" onClick={() => setPending(null)}>Pick another</button>
        </div>
      ) : (
        <>
          <PlaceSearch index={index} onPick={pick} />
          {!q.noChips && chips.length > 0 && (
            <div className="chips" aria-label="Places you’ve named">
              {chips.map(c => <button key={c.id} className="chip" onClick={() => pick(c)}>{c.name}</button>)}
            </div>
          )}
          <div className="row">
            <button className="secondary" onClick={() => onAnswer({ status: 'skipped' })}>Skip</button>
            <button className="secondary" onClick={() => onAnswer({ status: 'cant_remember' })}>Can’t remember</button>
          </div>
        </>
      )}
    </main>
  );
}

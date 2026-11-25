import { QUESTIONS } from '../data/questions';
import type { CityIndex } from '../lib/places/index';
import type { Session } from '../state/session';

export function Review({ s, index, onEdit, onEditOthers, onSeal }: {
  s: Session; index: CityIndex | null; onEdit: (i: number) => void; onEditOthers: () => void; onSeal: () => void;
}) {
  const label = (i: number) => {
    const a = s.answers[QUESTIONS[i].id];
    if (!a) return '—';
    if (a.status === 'skipped') return 'Skipped';
    if (a.status === 'cant_remember') return 'Can’t remember';
    const c = a.place ? index?.byId.get(a.place) : undefined;
    return c ? `${c.name}, ${c.country}` : '…';
  };
  return (
    <main className="screen">
      <p className="eyebrow">Check your answers</p>
      <h2 className="question">Happy with these?</h2>
      <ul className="review">
        {QUESTIONS.map((q, i) => (
          <li key={q.id}><button onClick={() => onEdit(i)}><span className="q">{q.title}</span><span className="a">{label(i)}</span></button></li>
        ))}
        <li><button onClick={onEditOthers}><span className="q">Also been</span><span className="a">{s.others.length ? `${s.others.length} places` : '—'}</span></button></li>
      </ul>
      <p className="hint">Once you seal, your answers are locked. Then you’ll swap codes.</p>
      <button className="primary" onClick={() => { if (confirm('Seal your answers? You won’t be able to change them.')) onSeal(); }}>Seal my answers</button>
    </main>
  );
}

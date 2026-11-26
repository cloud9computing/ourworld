import { byId, questionText } from '../data/bank';
import type { CityIndex } from '../lib/places/index';
import type { Game } from '../state/game';

export function Review({ g, index, onEdit, onEditList, onSeal }: {
  g: Game; index: CityIndex | null; onEdit: (i: number) => void; onEditList: (which: 'together' | 'lived') => void; onSeal: () => void;
}) {
  const label = (qid: number) => {
    const a = g.answers[qid];
    if (!a || a.status === 'skipped') return 'Skipped';
    const c = a.place ? index?.byId.get(a.place) : undefined;
    return c ? `${c.name}, ${c.country}` : '…';
  };
  return (
    <main className="screen">
      <p className="eyebrow">Last look</p>
      <h2 className="question">Happy with these?</h2>
      <ul className="review">
        {g.questions.map((qid, i) => (
          <li key={qid}><button onClick={() => onEdit(i)}><span className="q">{questionText(byId.get(qid)!, g.partnerName)}</span><span className="a">{label(qid)}</span></button></li>
        ))}
        <li><button onClick={() => onEditList('together')}><span className="q">Other places together</span><span className="a">{g.together.length || '—'}</span></button></li>
        <li><button onClick={() => onEditList('lived')}><span className="q">Cities lived in together</span><span className="a">{g.lived.length || '—'}</span></button></li>
      </ul>
      <p className="hint">Once you seal, your answers are locked. Then you’ll swap codes.</p>
      <button className="primary" onClick={() => { if (confirm('Seal your answers? You won’t be able to change them.')) onSeal(); }}>Seal my answers</button>
    </main>
  );
}

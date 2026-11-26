import { useState } from 'react';
import { copy } from '../data/copy';

export function Join({ from, suggested, onJoin }: { from: string; suggested: string; onJoin: (name: string) => void }) {
  const [name, setName] = useState(suggested);
  return (
    <main className="screen join">
      <p className="eyebrow center">You’re invited</p>
      <h2 className="question center">{copy.invited(from)}</h2>
      <ol className="rules">
        <li><span>1</span><div><strong>12 questions</strong><p>About places in your lives. Takes 5 minutes.</p></div></li>
        <li><span>2</span><div><strong>On your own</strong><p>Answer privately. No peeking, no hints.</p></div></li>
        <li><span>3</span><div><strong>Then swap</strong><p>Scan each other’s codes to see the world you make together.</p></div></li>
      </ol>
      <form onSubmit={e => { e.preventDefault(); if (name.trim()) onJoin(name.trim()); }}>
        <label className="field"><span className="eyebrow">Your name</span>
          <input className="line" value={name} maxLength={20} onChange={e => setName(e.target.value)} autoComplete="given-name" />
        </label>
        <button className="primary" disabled={!name.trim()}>I’m in</button>
      </form>
    </main>
  );
}

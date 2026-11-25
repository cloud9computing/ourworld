import { useState } from 'react';

export function Name({ initial, onDone }: { initial: string; onDone: (name: string) => void }) {
  const [name, setName] = useState(initial);
  const [adult, setAdult] = useState(false);
  const ok = name.trim().length > 0 && adult;
  return (
    <main className="screen">
      <p className="eyebrow">Before we start</p>
      <h2 className="question">What’s your first name?</h2>
      <form onSubmit={e => { e.preventDefault(); if (ok) onDone(name.trim()); }}>
        <input value={name} maxLength={24} onChange={e => setName(e.target.value)} placeholder="First name" autoFocus autoComplete="given-name" />
        <label className="check"><input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} /> I’m 18 or over</label>
        <button className="primary" disabled={!ok}>Next</button>
      </form>
    </main>
  );
}

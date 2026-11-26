import { useState } from 'react';
import { copy } from '../data/copy';
import { TIERS, type Tier } from '../data/bank';

export function Setup({ onDone, onBack }: { onDone: (me: string, partner: string, tier: Tier) => void; onBack: () => void }) {
  const [me, setMe] = useState('');
  const [partner, setPartner] = useState('');
  // required: "Just met" changes the whole game, so there's no default
  const [tier, setTier] = useState<Tier | null>(null);
  const [adult, setAdult] = useState(false);
  const ok = me.trim().length > 0 && partner.trim().length > 0 && adult && tier !== null;
  return (
    <main className="screen">
      <div className="topbar"><button className="link" onClick={onBack}>← Back</button><span /></div>
      <p className="eyebrow">Step 1 of 2</p>
      <h2 className="question">Who’s on this date?</h2>
      <form onSubmit={e => { e.preventDefault(); if (ok && tier !== null) onDone(me.trim(), partner.trim(), tier); }}>
        <label className="field"><span className="eyebrow">Your name</span>
          <input className="line" value={me} maxLength={20} onChange={e => setMe(e.target.value)} autoComplete="given-name" autoFocus />
        </label>
        <label className="field"><span className="eyebrow">Your partner</span>
          <input className="line" value={partner} maxLength={20} onChange={e => setPartner(e.target.value)} autoComplete="off" />
        </label>
        <fieldset className="field">
          <legend className="eyebrow">How long have you been together?</legend>
          <div className="chips">
            {TIERS.map((t, i) => (
              <button type="button" key={t.label} className={`chip ${tier === i ? 'on' : ''}`} aria-pressed={tier === i} onClick={() => setTier(i as Tier)}>{t.label}</button>
            ))}
          </div>
          <p className="hint">{copy.setupHelper}</p>
        </fieldset>
        <label className="check"><input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} /> We’re both 18 or over</label>
        <button className="primary" disabled={!ok}>Next</button>
      </form>
    </main>
  );
}

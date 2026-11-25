import { useEffect, useMemo, useState } from 'react';
import { copy } from '../data/copy';
import { QUESTIONS } from '../data/questions';
import { classify, compareLists } from '../lib/reveal/reveal';
import { countryName, type City } from '../lib/places/index';
import { buildWorld } from '../lib/shape/world';
import { THEME } from '../lib/shape/poster';
import { Chart } from '../components/Chart';
import type { Person } from '../state/people';

type Step =
  | { kind: 'intro' }
  | { kind: 'question'; i: number }
  | { kind: 'lists' }
  | { kind: 'world'; who: 'a' | 'b' }
  | { kind: 'ours' };

const where = (c?: City) => (c ? c.name : '');

export function Reveal({ a, b, land, onPoster }: { a: Person; b: Person; land: number[]; onPoster: () => void }) {
  const steps = useMemo<Step[]>(() => {
    const qs = QUESTIONS.map((q, i) => ({ q, i })).filter(({ q }) => a.answers[q.id] || b.answers[q.id]);
    const lists = a.others.length + b.others.length > 0;
    return [{ kind: 'intro' }, ...qs.map(({ i }) => ({ kind: 'question' as const, i })), ...(lists ? [{ kind: 'lists' as const }] : []),
      { kind: 'world', who: 'a' }, { kind: 'world', who: 'b' }, { kind: 'ours' }];
  }, [a, b]);
  const [n, setN] = useState(0);
  const step = steps[n];
  const model = useMemo(() => buildWorld(a.world, b.world), [a, b]);
  const names = useMemo<[string, string]>(() => [a.name, b.name], [a, b]);

  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (step.kind !== 'ours') return;
    setProgress(0);
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / 3000); setProgress(p); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step.kind]);

  const next = () => (n < steps.length - 1 ? setN(n + 1) : onPoster());
  const back = () => n > 0 && setN(n - 1);

  let body: JSX.Element;
  if (step.kind === 'intro') {
    body = (<>
      <p className="eyebrow">The reveal</p>
      <h2 className="question">{a.name} <span className="amp">&amp;</span> {b.name}</h2>
      <p className="lede">One question at a time. Then your two worlds, and the shape they make together.</p>
    </>);
  } else if (step.kind === 'question') {
    const q = QUESTIONS[step.i];
    const ca = a.answers[q.id], cb = b.answers[q.id];
    const m = classify(ca, cb);
    const line = q.dream
      ? m === 'same' ? copy.sameDream(where(ca)) : m === 'region' ? copy.nearDream(countryName(ca!.cc))
        : m === 'different' ? copy.twoDreams(a.name, where(ca), b.name, where(cb)) : m === 'onlyA' ? copy.onlyOne(a.name, where(ca)) : copy.onlyOne(b.name, where(cb))
      : m === 'same' ? copy.same(where(ca)) : m === 'region' ? copy.sameRegion(countryName(ca!.cc))
        : m === 'different' ? copy.different(a.name, where(ca), b.name, where(cb)) : m === 'onlyA' ? copy.onlyOne(a.name, where(ca)) : copy.onlyOne(b.name, where(cb));
    body = (<>
      <p className="eyebrow">{q.title}</p>
      <h2 className="question small">{q.prompt}</h2>
      <div className={`pair ${m}`}>
        <Answer name={a.name} city={ca} color={THEME.a} />
        <Answer name={b.name} city={cb} color={THEME.b} />
      </div>
      <p className={`verdict ${m}`}>{line}</p>
    </>);
  } else if (step.kind === 'lists') {
    const r = compareLists(a.visited, b.visited);
    const names3 = (cs: City[]) => cs.slice(0, 8).map(c => c.name).join(', ') + (cs.length > 8 ? ` and ${cs.length - 8} more` : '');
    body = (<>
      <p className="eyebrow">Everywhere else</p>
      <h2 className="question small">The places in between</h2>
      {r.both.length > 0 && <p className="verdict same">{copy.sharedPlaces(names3(r.both))}</p>}
      {r.onlyA.length > 0 && <p className="list-line" style={{ color: THEME.a }}>{copy.onlyKept(a.name, names3(r.onlyA))}</p>}
      {r.onlyB.length > 0 && <p className="list-line" style={{ color: THEME.b }}>{copy.onlyKept(b.name, names3(r.onlyB))}</p>}
    </>);
  } else if (step.kind === 'world') {
    const p = step.who === 'a' ? a : b;
    body = (<>
      <p className="eyebrow" style={{ color: step.who === 'a' ? THEME.a : THEME.b }}>{copy.yourWorld(p.name)}</p>
      <Chart model={model} land={land} names={names} layers={{ a: step.who === 'a', b: step.who === 'b', ours: false }} label={copy.yourWorld(p.name)} />
    </>);
  } else {
    body = (<>
      <p className="eyebrow pink">{copy.ourWorld}</p>
      <Chart model={model} land={land} names={names} progress={progress} label={copy.altText(model.counts.places)} />
      <p className="counts">{copy.togetherCounts(model.counts.places, model.counts.countries)}</p>
    </>);
  }

  return (
    <main className="screen reveal">
      <div className="topbar">{n > 0 ? <button className="link" onClick={back}>← Back</button> : <span />}<span className="progress">{n + 1} / {steps.length}</span></div>
      {body}
      <button className="primary" onClick={next}>{n === steps.length - 1 ? 'Make our poster' : 'Next'}</button>
    </main>
  );
}

function Answer({ name, city, color }: { name: string; city?: City; color: string }) {
  return (
    <div className="answer" style={{ borderColor: color }}>
      <span className="who" style={{ color }}>{name}</span>
      {city ? <><span className="city">{city.name}</span><span className="country">{city.country}</span></> : <span className="country">—</span>}
    </div>
  );
}

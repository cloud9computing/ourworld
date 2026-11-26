import { useEffect, useMemo, useState } from 'react';
import { copy } from '../data/copy';
import { byId, sharedText, type BankQuestion } from '../data/bank';
import { classify, compareLists } from '../lib/reveal/reveal';
import { connectingFact } from '../lib/reveal/facts';
import type { City, CityIndex } from '../lib/places/index';
import { buildWorld } from '../lib/shape/world';
import { cropSvg } from '../lib/shape/chart';
import { Chart } from '../components/Chart';
import type { Person } from '../state/people';

type Step = { kind: 'intro' } | { kind: 'q'; q: BankQuestion; n: number } | { kind: 'lists' };

export function Reveal({ a, b, questions, index, land, onFinal, onExit }: {
  a: Person; b: Person; questions: number[]; index: CityIndex; land: ArrayLike<number>; onFinal: () => void; onExit: () => void;
}) {
  const steps = useMemo<Step[]>(() => {
    const qs = questions.map(id => byId.get(id)).filter((q): q is BankQuestion => !!q);
    const out: Step[] = [{ kind: 'intro' }];
    qs.forEach((q, i) => { if (a.answers[q.id] || b.answers[q.id]) out.push({ kind: 'q', q, n: i + 1 }); });
    if (a.together.length + a.lived.length + b.together.length + b.lived.length > 0) out.push({ kind: 'lists' });
    return out;
  }, [a, b, questions]);
  const [n, setN] = useState(0);
  const [flipped, setFlipped] = useState(0);
  const [merged, setMerged] = useState(false);
  const step = steps[n];
  useEffect(() => { window.scrollTo(0, 0); }, [n]);

  // same place: after both cards are up, they slide into one, with a pulse and a light vibration
  const sameNow = step.kind === 'q' && step.q.act !== 1 && flipped >= 2 && classify(a.answers[step.q.id], b.answers[step.q.id], index.isSmall) === 'same';
  useEffect(() => {
    if (!sameNow) return;
    const t = window.setTimeout(() => { setMerged(true); try { navigator.vibrate?.(30); } catch { /* not supported */ } }, 700);
    return () => window.clearTimeout(t);
  }, [sameNow]);

  // the shape so far: every place revealed up to this moment
  const preview = useMemo(() => {
    const seenA: City[] = [], seenB: City[] = [];
    steps.forEach((s, i) => {
      if (i > n) return;
      if (s.kind === 'q' && s.q.act !== 3) {
        const now = i === n;
        const ca = a.answers[s.q.id], cb = b.answers[s.q.id];
        if (ca && (!now || flipped >= 1)) seenA.push(ca);
        if (cb && (!now || flipped >= 2)) seenB.push(cb);
      }
      if (s.kind === 'lists') { seenA.push(...a.together, ...a.lived); seenB.push(...b.together, ...b.lived); }
    });
    return buildWorld({ name: a.name, visited: seenA, dreams: [] }, { name: b.name, visited: seenB, dreams: [] });
  }, [steps, n, flipped, a, b]);

  // reset the cards in the same update that changes the question, so no answer ever shows face up early
  const go = (to: number) => { setFlipped(0); setMerged(false); setN(to); };
  const next = () => (n < steps.length - 1 ? go(n + 1) : onFinal());
  const back = () => (n > 0 ? go(n - 1) : onExit());

  let body: JSX.Element;
  let ready = true;
  if (step.kind === 'intro') {
    body = (<div className="reveal-intro">
      <p className="eyebrow center">The reveal</p>
      <h2 className="display center">{a.name} <span className="amp">&amp;</span> {b.name}</h2>
      <p className="lede center">{copy.revealReady}</p>
    </div>);
  } else if (step.kind === 'q') {
    const q = step.q, ca = a.answers[q.id], cb = b.answers[q.id];
    const m = classify(ca, cb, index.isSmall);
    const bothShown = flipped >= 2;
    ready = bothShown;
    const same = m === 'same' && q.act !== 1;
    body = (<>
      <p className="eyebrow center">Question {step.n} of {questions.length}</p>
      <h2 className="question small center">{sharedText(q)}</h2>
      {merged ? (
        <div className="cards one"><Card label={`${a.name} & ${b.name}`} city={ca} land={land} glow /></div>
      ) : (
        <div className={`cards ${bothShown && same ? 'merging' : ''}`}>
          <Flip shown={flipped >= 1} prompt={copy.tapToSee(b.name, a.name)} onFlip={() => setFlipped(1)} enabled={flipped === 0}>
            <Card label={a.name} city={ca} land={land} />
          </Flip>
          <Flip shown={flipped >= 2} prompt={copy.tapToSee(a.name, b.name)} onFlip={() => setFlipped(2)} enabled={flipped === 1}>
            <Card label={b.name} city={cb} land={land} />
          </Flip>
        </div>
      )}
      {bothShown && <Outcome q={q} m={m} a={a} b={b} ca={ca} cb={cb} index={index} />}
    </>);
  } else {
    // a listed place counts as shared if the other person named it anywhere, not only in their lists
    const listA = [...a.together, ...a.lived], listB = [...b.together, ...b.lived];
    const inA = compareLists(listA, b.places.visited as City[]), inB = compareLists(listB, a.places.visited as City[]);
    const both = [...inA.both, ...inB.both].filter((c, i, all) => all.findIndex(x => x.id === c.id) === i);
    const ra = { both, onlyA: inA.onlyA, onlyB: inB.onlyA };
    const names = (cs: City[]) => cs.map(c => c.name).join(', ');
    body = (<>
      <p className="eyebrow center">Everywhere else</p>
      <h2 className="question small center">The places in between</h2>
      {ra.both.length > 0 && <p className="verdict same center">{copy.bothListed(names(ra.both))}</p>}
      <ul className="kept">
        {ra.onlyA.map(c => <li key={`a${c.id}`}>{copy.onlyKept(a.name, c.name)}</li>)}
        {ra.onlyB.map(c => <li key={`b${c.id}`}>{copy.onlyKept(b.name, c.name)}</li>)}
      </ul>
      {ra.onlyA.length + ra.onlyB.length > 0 && <p className="hint center">{copy.onlyKeptSub}</p>}
    </>);
  }

  return (
    <main className="screen reveal">
      <div className="reveal-body">{body}</div>
      <div className="reveal-nav">
        <button className="link" onClick={back}>Back</button>
        <button className="link strong" disabled={!ready} onClick={next}>{n === 0 ? 'Begin →' : n === steps.length - 1 ? 'See your world →' : 'Next question →'}</button>
      </div>
      <div className="reveal-foot" aria-live="polite">
        <p className="meta center">{copy.yourShape(preview.counts.places)}</p>
        <Chart className="foot-chart" model={preview} land={land} mode="ours" dreams={false} label={copy.yourShape(preview.counts.places)} />
      </div>
    </main>
  );
}

function Flip({ shown, prompt, enabled, onFlip, children }: { shown: boolean; prompt: string; enabled: boolean; onFlip: () => void; children: JSX.Element }) {
  return (
    <button className={`flip ${shown ? 'shown' : ''}`} disabled={!enabled && !shown} onClick={() => enabled && onFlip()} aria-label={shown ? undefined : prompt}>
      <div className="flip-inner">
        <div className="face back"><span className="tap">{prompt}</span></div>
        <div className="face front">{children}</div>
      </div>
    </button>
  );
}

function Card({ label, city, land, glow }: { label: string; city?: City; land: ArrayLike<number>; glow?: boolean }) {
  const crop = useMemo(() => (city ? cropSvg(city, land) : ''), [city, land]);
  return (
    <div className={`card ${glow ? 'glow' : ''}`}>
      <div className="crop" dangerouslySetInnerHTML={{ __html: crop }} />
      <span className="who">{label}</span>
      {city ? <><span className="city">{city.name}</span><span className="country">{city.country}</span></> : <span className="country">Skipped</span>}
    </div>
  );
}

function Outcome({ q, m, a, b, ca, cb, index }: {
  q: BankQuestion; m: ReturnType<typeof classify>; a: Person; b: Person; ca?: City; cb?: City; index: CityIndex;
}) {
  const fact = ca && cb && m !== 'same' ? connectingFact(ca, cb, index) : '';
  let line = '', sub = '';
  if (q.act === 1) {
    return (<div className="outcome">
      <p className="verdict center">{ca ? copy.beforeUs(a.name, ca.name) : copy.beforeUsNone(a.name)}</p>
      <p className="verdict center">{cb ? copy.beforeUs(b.name, cb.name) : copy.beforeUsNone(b.name)}</p>
    </div>);
  }
  if (q.about) {
    return (<div className="outcome">
      {ca && <p className="verdict center">{q.about.mirror(a.name, b.name, ca.name)}</p>}
      {cb && <p className="verdict center">{q.about.mirror(b.name, a.name, cb.name)}</p>}
      {fact && <p className="fact center">{fact}</p>}
    </div>);
  }
  const who = m === 'onlyA' ? a.name : b.name, city = m === 'onlyA' ? ca : cb;
  if (q.act === 3) {
    if (m === 'same') { line = copy.sameDream(ca!.name); sub = copy.sameDreamSub; }
    else if (m === 'region' || m === 'different') line = copy.twoDreams;
    else line = copy.onlyDream(who, city!.name);
  } else {
    if (m === 'same') { line = copy.same(ca!.name); sub = copy.sameSub; }
    else if (m === 'region') line = ca!.cc === cb!.cc ? copy.sameRegion(ca!.country) : copy.sameRegionNear;
    else if (m === 'different') line = copy.twoGood(q.noun);
    else line = copy.onlyOne(who, city!.name);
  }
  return (<div className={`outcome ${m}`}>
    <p className={`verdict center ${m === 'same' ? 'same' : ''}`}>{line}</p>
    {sub && <p className="hint center">{sub}</p>}
    {fact && <p className="fact center">{fact}</p>}
  </div>);
}

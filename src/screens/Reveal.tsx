import { useEffect, useMemo, useState } from 'react';
import { copy } from '../data/copy';
import { byId, JUST_MET, promptFor, sharedText, type BankQuestion, type Tier } from '../data/bank';
import { classify, compareLists } from '../lib/reveal/reveal';
import { connectingFact } from '../lib/reveal/facts';
import { alreadyShared, beenKey, exploreCount, exploreList } from '../lib/explore';
import type { City, CityIndex } from '../lib/places/index';
import { buildWorld } from '../lib/shape/world';
import { cropSvg } from '../lib/shape/chart';
import { Chart } from '../components/Chart';
import type { Person } from '../state/people';

type Step =
  | { kind: 'intro' }
  | { kind: 'past'; q: BankQuestion; owner: Person; other: Person }
  | { kind: 'pair'; q: BankQuestion }
  | { kind: 'guess'; q: BankQuestion; guesser: Person; owner: Person }
  | { kind: 'lists' }
  | { kind: 'more' };

const IN_WORLD = new Set(['past', 'us', 'mine', 'show', 'backTo']);
const vibrate = () => { try { navigator.vibrate?.(30); } catch { /* not supported */ } };

export function Reveal({ a, b, tier, round, questions, index, land, been, went, onBeen, onFinal, onExit }: {
  a: Person; b: Person; tier: Tier; round: number; questions: number[]; index: CityIndex; land: ArrayLike<number>;
  been: Record<string, boolean>; went: number[]; onBeen: (key: string, together: boolean) => void;
  onFinal: () => void; onExit: () => void;
}) {
  const justMet = tier === JUST_MET;
  const qs = useMemo(() => questions.map(id => byId.get(id)).filter((q): q is BankQuestion => !!q), [questions]);
  const steps = useMemo<Step[]>(() => {
    const out: Step[] = [{ kind: 'intro' }];
    for (const q of qs) {
      const ca = a.answers[q.id], cb = b.answers[q.id];
      if (q.kind === 'past' && !(ca && cb && classify(ca, cb) === 'same')) {
        // Act 1: each partner's place on its own, so the other can say whether they've been there together
        if (ca) out.push({ kind: 'past', q, owner: a, other: b });
        if (cb) out.push({ kind: 'past', q, owner: b, other: a });
      } else if (q.kind === 'guess' && q.guessOf) {
        for (const [guesser, owner] of [[a, b], [b, a]] as [Person, Person][]) {
          if (guesser.answers[q.id] || owner.answers[q.guessOf]) out.push({ kind: 'guess', q, guesser, owner });
        }
      } else if (ca || cb) out.push({ kind: 'pair', q });
    }
    if (a.together.length + a.lived.length + b.together.length + b.lived.length > 0) out.push({ kind: 'lists' });
    out.push({ kind: 'more' });
    return out;
  }, [qs, a, b]);

  const [n, setN] = useState(0);
  const [flipped, setFlipped] = useState(0);
  const [merged, setMerged] = useState(false);
  const step = steps[n];
  useEffect(() => { window.scrollTo(0, 0); }, [n]);

  // the two answers on the current card(s)
  const pairOf = (s: Step): [City | undefined, City | undefined] =>
    s.kind === 'pair' ? [a.answers[s.q.id], b.answers[s.q.id]]
      : s.kind === 'guess' ? [s.guesser.answers[s.q.id], s.owner.answers[s.q.guessOf!]] : [undefined, undefined];
  const [c1, c2] = pairOf(step);
  const isSame = (step.kind === 'pair' || step.kind === 'guess') && flipped >= 2 && classify(c1, c2, index.isSmall) === 'same';

  // a match: after both cards are up, they slide into one, with a pulse and a light vibration
  useEffect(() => {
    if (!isSame) return;
    const t = window.setTimeout(() => { setMerged(true); vibrate(); }, 700);
    return () => window.clearTimeout(t);
  }, [isSame]);

  const explore = useMemo(() => exploreList({ tier, questions, a, b, been, went }), [tier, questions, a, b, been, went]);

  // the shape so far: every place revealed up to this moment
  const preview = useMemo(() => {
    const seenA: City[] = [], seenB: City[] = [];
    const add = (p: Person, c?: City) => { if (c) (p === a ? seenA : seenB).push(c); };
    steps.forEach((s, i) => {
      if (i > n) return;
      const now = i === n;
      if (s.kind === 'past' && (!now || flipped >= 1)) add(s.owner, s.owner.answers[s.q.id]);
      if (s.kind === 'pair' && IN_WORLD.has(s.q.kind)) {
        if (!now || flipped >= 1) add(a, a.answers[s.q.id]);
        if (!now || flipped >= 2) add(b, b.answers[s.q.id]);
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
  } else if (step.kind === 'past') {
    const { q, owner, other } = step;
    const place = owner.answers[q.id]!;
    const key = beenKey(q.id, owner.role);
    const shared = alreadyShared(place, other, qs);
    const choice = shared ? true : justMet ? false : been[key];
    ready = flipped >= 1 && choice !== undefined;
    body = (<>
      <p className="eyebrow center">{sharedText(q)}</p>
      <div className="cards one">
        <Flip shown={flipped >= 1} prompt={copy.tapToSee(other.name, owner.name)} enabled={flipped === 0}
          onFlip={() => { setFlipped(1); if (justMet && !shared) vibrate(); }}>
          <Card label={owner.name} city={place} land={land} discover={flipped >= 1 && choice === false} />
        </Flip>
      </div>
      {flipped >= 1 && (<div className="outcome">
        <p className="verdict center">{justMet ? copy.theirWorld(owner.name, place.name) : copy.beforeUs(owner.name, place.name)}</p>
        <Prompts lines={[promptFor(q, round, owner.name)]} />
        {choice === undefined ? (
          <div className="row choice">
            <button className="secondary" onClick={() => onBeen(key, true)}>{copy.beenTogether}</button>
            <button className="primary" onClick={() => { onBeen(key, false); vibrate(); }}>{copy.notYet}</button>
          </div>
        ) : choice ? (
          <p className="hint center">{copy.alreadyShare}</p>
        ) : (
          <p className="discovery center">{copy.newTo(other.name, place.name)}<span className="travel" aria-hidden /></p>
        )}
      </div>)}
    </>);
  } else if (step.kind === 'pair' || step.kind === 'guess') {
    const q = step.q;
    const guess = step.kind === 'guess';
    const first = guess ? step.guesser : a, second = guess ? step.owner : b;
    const m = classify(c1, c2, index.isSmall);
    ready = flipped >= 2;
    const label1 = guess ? `${first.name}’s guess` : first.name;
    body = (<>
      <p className="eyebrow center">{sharedText(q)}</p>
      {merged ? (
        <div className="cards one"><Card label={guess ? `${first.name} guessed it` : `${a.name} & ${b.name}`} city={c1} land={land} glow /></div>
      ) : (
        <div className={`cards ${isSame ? 'merging' : ''}`}>
          <Flip shown={flipped >= 1} prompt={copy.tapToSee(second.name, guess ? `${first.name}’s guess` : first.name)} onFlip={() => setFlipped(1)} enabled={flipped === 0}>
            <Card label={label1} city={c1} land={land} />
          </Flip>
          <Flip shown={flipped >= 2} prompt={copy.tapToSee(first.name, second.name)} onFlip={() => setFlipped(2)} enabled={flipped === 1}>
            <Card label={second.name} city={c2} land={land} />
          </Flip>
        </div>
      )}
      {flipped >= 2 && (guess
        ? <GuessOutcome q={q} guesser={first} owner={second} guessCity={c1} truthCity={c2} same={m === 'same'} round={round} />
        : <PairOutcome q={q} m={m} a={a} b={b} ca={c1} cb={c2} index={index} round={round} />)}
    </>);
  } else if (step.kind === 'lists' && justMet) {
    // "Just met": the list is "Any other places you love?", each person's own, so nothing is compared
    body = (<>
      <p className="eyebrow center">Everywhere else</p>
      <h2 className="question small center">More places you love</h2>
      <ul className="kept">
        {[a, b].filter(p => p.together.length).map(p => <li key={p.name}>{copy.moreOfWorld(p.name, p.together.map(c => c.name).join(', '))}</li>)}
      </ul>
    </>);
  } else if (step.kind === 'lists') {
    const listA = [...a.together, ...a.lived], listB = [...b.together, ...b.lived];
    const inA = compareLists(listA, b.places.visited as City[]), inB = compareLists(listB, a.places.visited as City[]);
    const both = [...inA.both, ...inB.both].filter((c, i, all) => all.findIndex(x => x.id === c.id) === i);
    body = (<>
      <p className="eyebrow center">Everywhere else</p>
      <h2 className="question small center">The places in between</h2>
      {both.length > 0 && <p className="verdict same center">{copy.bothListed(both.map(c => c.name).join(', '))}</p>}
      <ul className="kept">
        {inA.onlyA.map(c => <li key={`a${c.id}`}>{copy.onlyKept(a.name, c.name)}</li>)}
        {inB.onlyA.map(c => <li key={`b${c.id}`}>{copy.onlyKept(b.name, c.name)}</li>)}
      </ul>
      {inA.onlyA.length + inB.onlyA.length > 0 && <p className="hint center">{copy.onlyKeptSub}</p>}
    </>);
  } else {
    body = <More count={exploreCount(explore)} first={explore.filter(e => !e.went).slice(0, 3).map(e => `${e.place.name} · ${e.origin}`)} />;
  }

  return (
    <main className="screen reveal">
      <div className="reveal-body">{body}</div>
      <div className="reveal-nav">
        <button className="link" onClick={back}>Back</button>
        <button className="link strong" disabled={!ready} onClick={next}>{n === 0 ? 'Begin →' : n === steps.length - 1 ? 'See your world →' : 'Next →'}</button>
      </div>
      <div className="reveal-foot" aria-live="polite">
        <p className="meta center">{copy.yourShape(preview.counts.places)}</p>
        <Chart className="foot-chart" model={preview} land={land} mode="ours" dreams={false} label={copy.yourShape(preview.counts.places)} />
      </div>
    </main>
  );
}

function Prompts({ lines }: { lines: string[] }) {
  return (<div className="prompts">
    {lines.map(l => <p key={l} className="prompt center">{l}</p>)}
    <p className="hint center">{copy.takeYourTime}</p>
  </div>);
}

function PairOutcome({ q, m, a, b, ca, cb, index, round }: {
  q: BankQuestion; m: ReturnType<typeof classify>; a: Person; b: Person; ca?: City; cb?: City; index: CityIndex; round: number;
}) {
  const fact = ca && cb && m !== 'same' ? connectingFact(ca, cb, index) : '';
  // prompts go to whoever gave each answer; a match asks both
  const prompts = m === 'same'
    ? [promptFor(q, round, 'each other')]
    : [...(ca ? [promptFor(q, round, a.name)] : []), ...(cb ? [promptFor(q, round, b.name)] : [])];
  let line = '', sub = '';
  const who = m === 'onlyA' ? a.name : b.name, city = m === 'onlyA' ? ca : cb;
  if (m === 'same') {
    line = q.kind === 'dream' || q.kind === 'show' ? copy.bothWant(ca!.name) : copy.same(ca!.name);
    sub = q.kind === 'dream' || q.kind === 'show' ? copy.sameDreamSub : copy.sameSub;
  } else if (q.about) {
    return (<div className="outcome">
      {ca && <p className="verdict center">{q.about(a.name, b.name, ca.name)}</p>}
      {cb && <p className="verdict center">{q.about(b.name, a.name, cb.name)}</p>}
      {fact && <p className="fact center">{fact}</p>}
      <Prompts lines={prompts} />
    </div>);
  } else if (q.kind === 'dream' || q.kind === 'show') {
    line = m === 'region' || m === 'different' ? copy.twoDreams : copy.onlyDream(who, city!.name);
  } else if (m === 'region') line = ca!.cc === cb!.cc ? copy.sameRegion(ca!.country) : copy.sameRegionNear;
  else if (m === 'different') line = copy.twoGood(q.noun);
  else line = copy.onlyOne(who, city!.name);
  return (<div className={`outcome ${m}`}>
    <p className={`verdict center ${m === 'same' ? 'same' : ''}`}>{line}</p>
    {sub && <p className="hint center">{sub}</p>}
    {fact && <p className="fact center">{fact}</p>}
    <Prompts lines={prompts} />
  </div>);
}

function GuessOutcome({ q, guesser, owner, guessCity, truthCity, same, round }: {
  q: BankQuestion; guesser: Person; owner: Person; guessCity?: City; truthCity?: City; same: boolean; round: number;
}) {
  const prompt = guessCity ? [promptFor(q, round, guesser.name)] : [];
  if (same && truthCity) {
    return (<div className="outcome same">
      <p className="verdict same center">{copy.guessedRight(guesser.name, truthCity.name)}</p>
      <Prompts lines={prompt} />
    </div>);
  }
  return (<div className="outcome">
    <p className="verdict center">
      {guessCity && copy.guessed(guesser.name, guessCity.name)}{' '}
      {truthCity && q.truth?.(owner.name, truthCity.name)}
    </p>
    {guessCity && truthCity && <p className="hint center">{copy.nowYouKnow}</p>}
    <Prompts lines={prompt} />
  </div>);
}

/** "And there's more": counts up to the places to explore, and shows the first three with where they came from. */
function More({ count, first }: { count: number; first: string[] }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!count) return;
    let i = 0;
    const t = window.setInterval(() => { i++; setShown(i); if (i >= count) window.clearInterval(t); }, Math.max(40, 900 / count));
    return () => window.clearInterval(t);
  }, [count]);
  return (<div className="more">
    <h2 className="display center">{copy.andMore}</h2>
    {count > 0 ? (<>
      <p className="more-count center">{shown}</p>
      <p className="meta center">{copy.toExplore}</p>
      <ul className="explore-preview">{first.map(f => <li key={f}>{f}</li>)}</ul>
    </>) : <p className="lede center">{copy.exploredAll}</p>}
  </div>);
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

function Card({ label, city, land, glow, discover }: { label: string; city?: City; land: ArrayLike<number>; glow?: boolean; discover?: boolean }) {
  const crop = useMemo(() => (city ? cropSvg(city, land) : ''), [city, land]);
  return (
    <div className={`card ${glow ? 'glow' : ''} ${discover ? 'discover' : ''}`}>
      <div className="crop" dangerouslySetInnerHTML={{ __html: crop }} />
      <span className="who">{label}</span>
      {city ? <><span className="city">{city.name}</span><span className="country">{city.country}</span></> : <span className="country">Skipped</span>}
    </div>
  );
}

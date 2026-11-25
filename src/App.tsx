import { useCallback, useEffect, useMemo, useState } from 'react';
import { QUESTIONS } from './data/questions';
import { loadIndex, type City, type CityIndex } from './lib/places/index';
import { loadLand } from './lib/assets';
import { fromLink } from './lib/swap/codec';
import { clearSession, loadSession, newSession, saveSession, withPartner, type Answer, type PartnerData, type Session } from './state/session';
import { bothPeople, placeCount } from './state/people';
import { Home } from './screens/Home';
import { Name } from './screens/Name';
import { QuestionScreen } from './screens/QuestionScreen';
import { OthersScreen } from './screens/OthersScreen';
import { Review } from './screens/Review';
import { Swap } from './screens/Swap';
import { Reveal } from './screens/Reveal';
import { Poster } from './screens/Poster';

type View = { kind: 'home' } | { kind: 'name' } | { kind: 'q'; i: number } | { kind: 'others' } | { kind: 'review' } | { kind: 'swap' } | { kind: 'reveal' } | { kind: 'poster' };

/** Where someone should land when they open the app with a session in progress. */
function resume(s: Session): View {
  if (!s.firstName) return { kind: 'name' };
  if (s.sealedAt) return { kind: 'swap' };
  const i = QUESTIONS.findIndex(q => !s.answers[q.id]);
  if (i >= 0) return { kind: 'q', i };
  return s.othersDone ? { kind: 'review' } : { kind: 'others' };
}

export function App() {
  const [s, setS] = useState<Session | null>(() => loadSession());
  const [view, setView] = useState<View>({ kind: 'home' });
  const [index, setIndex] = useState<CityIndex | null>(null);
  const [land, setLand] = useState<number[] | null>(null);
  const [notice, setNotice] = useState('');
  const [fromReview, setFromReview] = useState(false);

  useEffect(() => { loadIndex().then(setIndex).catch(() => setNotice('Couldn’t load the city list. Check your connection and reload.')); }, []);
  useEffect(() => { if (view.kind === 'reveal' || view.kind === 'poster') loadLand().then(setLand); }, [view.kind]);
  useEffect(() => { window.scrollTo(0, 0); }, [view]);

  const update = useCallback((next: Session) => { saveSession(next); setS(next); }, []);

  // A code scanned with the phone's own camera app opens the site with the answers after "#s=".
  useEffect(() => {
    if (!location.hash.startsWith('#s=')) return;
    const text = location.href;
    history.replaceState(null, '', location.pathname);
    const cur = loadSession();
    if (!cur?.sealedAt) { setNotice('Seal your own answers first, then scan their code again. Nothing was saved.'); return; }
    try {
      const p = fromLink(text);
      const next = withPartner(cur, { deviceId: p.deviceId, firstName: p.firstName, answers: p.answers, others: p.others });
      update(next); setView({ kind: 'swap' });
    } catch (e) { setNotice((e as Error).message); }
  }, [update]);

  const people = useMemo(() => (index && s ? bothPeople(index, s) : null), [index, s]);

  if (!s || view.kind === 'home') {
    return (
      <>
        {notice && <p className="notice" onClick={() => setNotice('')}>{notice}</p>}
        <Home
          inProgress={!!s && !!s.firstName}
          onStart={() => { const n = newSession(); update(n); setView({ kind: 'name' }); }}
          onContinue={() => s && setView(resume(s))}
          onStartOver={() => { if (confirm('Start over? Your answers on this phone will be cleared.')) { const n = newSession(); update(n); setView({ kind: 'name' }); } }}
        />
      </>
    );
  }

  const chipsFor = (exclude: number[]): City[] => {
    const seen = new Set<number>(), out: City[] = [];
    for (const q of QUESTIONS) {
      const a = s.answers[q.id];
      if (q.id === 'home' || a?.status !== 'answered' || !a.place || seen.has(a.place) || exclude.includes(a.place)) continue;
      const c = index?.byId.get(a.place); if (c) { seen.add(a.place); out.push(c); }
    }
    return out;
  };
  const uses = new Map<number, number>();
  for (const a of Object.values(s.answers)) if (a?.status === 'answered' && a.place) uses.set(a.place, (uses.get(a.place) ?? 0) + 1);

  const afterAnswer = (i: number) => {
    if (fromReview) { setFromReview(false); setView({ kind: 'review' }); return; }
    setView(i + 1 < QUESTIONS.length ? { kind: 'q', i: i + 1 } : { kind: 'others' });
  };

  const page = (() => {
    switch (view.kind) {
      case 'name':
        return <Name initial={s.firstName} onDone={name => { update({ ...s, firstName: name }); setView(resume({ ...s, firstName: name })); }} />;
      case 'q': {
        const q = QUESTIONS[view.i];
        const home = s.answers.home?.place;
        return <QuestionScreen key={q.id} q={q} n={view.i + 1} total={QUESTIONS.length} index={index} current={s.answers[q.id]}
          chips={chipsFor(home ? [home] : [])} uses={uses} placesSoFar={placeCount(s)}
          onBack={view.i > 0 ? () => setView({ kind: 'q', i: view.i - 1 }) : undefined}
          onAnswer={(a: Answer) => { update({ ...s, answers: { ...s.answers, [q.id]: a } }); afterAnswer(view.i); }} />;
      }
      case 'others':
        return <OthersScreen index={index} initial={s.others} placesSoFar={placeCount(s)}
          onBack={() => setView({ kind: 'q', i: QUESTIONS.length - 1 })}
          onDone={ids => { update({ ...s, others: ids, othersDone: true }); setFromReview(false); setView({ kind: 'review' }); }} />;
      case 'review':
        return <Review s={s} index={index} onEdit={i => { setFromReview(true); setView({ kind: 'q', i }); }}
          onEditOthers={() => setView({ kind: 'others' })}
          onSeal={() => { update({ ...s, sealedAt: Date.now() }); setView({ kind: 'swap' }); }} />;
      case 'swap':
        if (!s.sealedAt) return null;
        return <Swap s={s} indexVersion={index?.version ?? '00000000'} onReveal={() => setView({ kind: 'reveal' })}
          onPartner={(p: PartnerData) => { try { update(withPartner(s, p)); return null; } catch (e) { return (e as Error).message; } }} />;
      case 'reveal':
      case 'poster':
        if (!people || !land) return <main className="screen"><p className="hint">Getting your worlds ready…</p></main>;
        return view.kind === 'reveal'
          ? <Reveal a={people[0]} b={people[1]} land={land} onPoster={() => setView({ kind: 'poster' })} />
          : <Poster a={people[0]} b={people[1]} land={land} onDone={() => { clearSession(); setS(null); setView({ kind: 'home' }); }} />;
    }
  })();

  return (
    <>
      {notice && <p className="notice" onClick={() => setNotice('')}>{notice}</p>}
      {page}
    </>
  );
}

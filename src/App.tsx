import { useCallback, useEffect, useMemo, useState } from 'react';
import { LISTS, byId, type Act, type Tier } from './data/bank';
import { loadIndex, type City, type CityIndex } from './lib/places/index';
import { loadLand } from './lib/assets';
import { selectQuestions } from './lib/game/select';
import { answersLink, inviteLink, readLink, type Answer, type Invite as InviteData } from './lib/swap/codec';
import { buildWorld } from './lib/shape/world';
import { clearGame, loadGame, myAnswers, randomHex, saveGame, withPartner, type Game } from './state/game';
import { bothPeople, me, placeCount } from './state/people';
import { Landing } from './screens/Landing';
import { Setup } from './screens/Setup';
import { Invite } from './screens/Invite';
import { Join } from './screens/Join';
import { Question } from './screens/Question';
import { Chapter } from './screens/Chapter';
import { ListQuestion } from './screens/ListQuestion';
import { Review } from './screens/Review';
import { Sealed } from './screens/Sealed';
import { Scanner } from './components/Scanner';
import { Reveal } from './screens/Reveal';
import { Final } from './screens/Final';
import { Poster } from './screens/Poster';

type View =
  | { kind: 'home' } | { kind: 'setup' } | { kind: 'invite' } | { kind: 'join'; invite: InviteData } | { kind: 'scanInvite' }
  | { kind: 'q'; i: number } | { kind: 'chapter'; act: Act; i: number } | { kind: 'list'; which: 'together' | 'lived' }
  | { kind: 'review' } | { kind: 'sealed' } | { kind: 'scanAnswers' } | { kind: 'reveal' } | { kind: 'final' } | { kind: 'poster' };

/** Where someone lands when they come back to a game in progress (F6: reopening resumes). */
function resume(g: Game): View {
  if (g.revealDone) return { kind: 'poster' };
  if (g.sealedAt) return { kind: 'sealed' };
  if (g.role === 0 && !g.started) return { kind: 'invite' };
  const i = g.questions.findIndex(q => !g.answers[q]);
  if (i >= 0) return { kind: 'q', i };
  if (!g.listsDone?.together) return { kind: 'list', which: 'together' };
  if (!g.listsDone?.lived) return { kind: 'list', which: 'lived' };
  return { kind: 'review' };
}

export function App() {
  const [g, setG] = useState<Game | null>(() => loadGame());
  const [view, setView] = useState<View>({ kind: 'home' });
  const [index, setIndex] = useState<CityIndex | null>(null);
  const [land, setLand] = useState<number[] | null>(null);
  const [notice, setNotice] = useState('');
  const [fromReview, setFromReview] = useState(false);
  const [newest, setNewest] = useState<number | undefined>();

  useEffect(() => { loadIndex().then(setIndex).catch(() => setNotice('Couldn’t load the city list. Check your connection and reload.')); }, []);
  useEffect(() => { loadLand().then(setLand).catch(() => { /* the map is decoration until the reveal */ }); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [view.kind]);

  const update = useCallback((next: Game) => { saveGame(next); setG(next); }, []);

  const acceptAnswers = useCallback((cur: Game | null, text: string): string | null => {
    try {
      const r = readLink(text);
      if (r.kind !== 'answers') return 'That’s an invite code. Scan the code on your partner’s sealed screen.';
      if (!cur) return 'Start or join a game first.';
      const next = withPartner(cur, r.answers);
      update(next);
      setView({ kind: 'sealed' });
      return null;
    } catch (e) { return (e as Error).message; }
  }, [update]);

  const openInvite = useCallback((cur: Game | null, invite: InviteData): string | null => {
    if (cur && cur.gameId === invite.gameId) { setView(resume(cur)); return null; }
    if (cur && !cur.revealDone && !confirm('Join this new game? It replaces the game on this phone.')) return 'Kept your current game.';
    setView({ kind: 'join', invite });
    return null;
  }, []);

  // Links opened from the phone's own camera app: an invite (#j=) or a partner's answers (#a=).
  useEffect(() => {
    const h = location.hash;
    if (!h.startsWith('#j=') && !h.startsWith('#a=')) return;
    const text = location.href;
    history.replaceState(null, '', location.pathname);
    const cur = loadGame();
    try {
      const r = readLink(text);
      if (r.kind === 'invite') { const err = openInvite(cur, r.invite); if (err) setNotice(err); }
      else { const err = acceptAnswers(cur, text); if (err) setNotice(err); }
    } catch (e) { setNotice((e as Error).message); }
  }, [openInvite, acceptAnswers]);

  const myPerson = useMemo(() => (index && g ? me(index, g) : null), [index, g]);
  const myModel = useMemo(() => buildWorld(myPerson?.places ?? { name: '', visited: [], dreams: [] }), [myPerson]);
  const people = useMemo(() => (index && g ? bothPeople(index, g) : null), [index, g]);
  const continentOf = useCallback((cc: string) => index?.continentOf(cc) ?? '', [index]);

  const notices = notice ? <p className="notice" role="status" onClick={() => setNotice('')}>{notice}</p> : null;

  const startNew = () => {
    if (g && !g.revealDone && !confirm('Start a new game? The game on this phone will be cleared.')) return;
    setView({ kind: 'setup' });
  };

  if (!g || view.kind === 'home' || view.kind === 'setup' || view.kind === 'join' || view.kind === 'scanInvite') {
    let page: JSX.Element;
    if (view.kind === 'setup') {
      page = <Setup onBack={() => setView({ kind: 'home' })} onDone={(myName: string, partnerName: string, tier: Tier) => {
        const gameId = randomHex(8);
        const next: Game = { v: 2, gameId, role: 0, myName, partnerName, tier, questions: selectQuestions(gameId, tier), answers: {}, together: [], lived: [], createdAt: Date.now() };
        update(next); setView({ kind: 'invite' });
      }} />;
    } else if (view.kind === 'join') {
      const inv = view.invite;
      page = <Join from={inv.from} suggested={inv.to} onJoin={name => {
        const next: Game = { v: 2, gameId: inv.gameId, role: 1, myName: name, partnerName: inv.from, tier: inv.tier, questions: inv.questions.filter(q => byId.has(q)), answers: {}, together: [], lived: [], started: true, createdAt: Date.now() };
        update(next); setView({ kind: 'q', i: 0 });
      }} />;
    } else if (view.kind === 'scanInvite') {
      page = <Scanner title="Scan your partner’s invite" hint="Point your camera at the code on your partner’s phone."
        onClose={() => setView({ kind: 'home' })}
        onText={text => {
          try { const r = readLink(text); return r.kind === 'invite' ? openInvite(g, r.invite) : 'That’s an answer code. Use it after you’ve sealed your own answers.'; }
          catch (e) { return (e as Error).message; }
        }} />;
    } else {
      page = <Landing land={land} status={!g ? 'none' : g.revealDone ? 'finished' : 'playing'}
        onStart={startNew} onScanInvite={() => setView({ kind: 'scanInvite' })}
        onContinue={() => g && setView(resume(g))} onPoster={() => setView({ kind: 'poster' })}
        onClear={() => { if (confirm('Clear this game from this phone?')) { clearGame(); setG(null); } }} />;
    }
    return <>{notices}{page}</>;
  }

  const qAt = (i: number) => byId.get(g.questions[i])!;
  const goAfter = (i: number) => {
    if (fromReview) { setFromReview(false); setView({ kind: 'review' }); return; }
    if (i + 1 >= g.questions.length) { setView({ kind: 'list', which: 'together' }); return; }
    const nextAct = qAt(i + 1).act;
    setView(nextAct !== qAt(i).act ? { kind: 'chapter', act: nextAct, i: i + 1 } : { kind: 'q', i: i + 1 });
  };

  const chips: City[] = [];
  const uses = new Map<number, number>();
  for (const qid of g.questions) {
    const a = g.answers[qid];
    if (a?.status !== 'answered' || !a.place) continue;
    uses.set(a.place, (uses.get(a.place) ?? 0) + 1);
    const c = index?.byId.get(a.place);
    if (c && !chips.some(x => x.id === c.id)) chips.push(c);
  }

  let page: JSX.Element | null = null;
  switch (view.kind) {
    case 'invite':
      page = <Invite from={g.myName} partner={g.partnerName} onBack={() => setView({ kind: 'home' })}
        link={inviteLink(location.origin, { gameId: g.gameId, tier: g.tier, from: g.myName, to: g.partnerName, questions: g.questions, indexVersion: index?.version ?? '00000000' })}
        onStart={() => { update({ ...g, started: true }); setView({ kind: 'q', i: 0 }); }} />;
      break;
    case 'q': {
      const q = qAt(view.i);
      page = <Question key={q.id} q={q} partner={g.partnerName} index={index} current={g.answers[q.id]}
        chips={q.act === 3 ? [] : chips} uses={uses} placesSoFar={placeCount(g)} model={myModel} land={land} newest={newest}
        onBack={view.i > 0 ? () => setView({ kind: 'q', i: view.i - 1 }) : undefined}
        onAnswer={(a: Answer) => {
          if (g.sealedAt) return;
          update({ ...g, answers: { ...g.answers, [q.id]: a } });
          if (a.place) setNewest(a.place);
          goAfter(view.i);
        }} />;
      break;
    }
    case 'chapter':
      page = <Chapter act={view.act} model={myModel} land={land} onContinue={() => setView({ kind: 'q', i: view.i })} />;
      break;
    case 'list': {
      const which = view.which;
      page = <ListQuestion key={which} title={LISTS[which].text} hint={LISTS[which].hint} step={which === 'together' ? 'One more' : 'Last one'}
        index={index} initial={g[which]} placesSoFar={placeCount(g)}
        onBack={() => setView(which === 'lived' ? { kind: 'list', which: 'together' } : { kind: 'q', i: g.questions.length - 1 })}
        onDone={ids => {
          if (g.sealedAt) return;
          update({ ...g, [which]: ids, listsDone: { ...g.listsDone, [which]: true } });
          if (fromReview || which === 'lived') { setFromReview(false); setView({ kind: 'review' }); } else setView({ kind: 'list', which: 'lived' });
        }} />;
      break;
    }
    case 'review':
      page = <Review g={g} index={index} onEdit={i => { setFromReview(true); setView({ kind: 'q', i }); }}
        onEditList={which => { setFromReview(true); setView({ kind: 'list', which }); }}
        onSeal={() => { update({ ...g, sealedAt: Date.now() }); setView({ kind: 'sealed' }); }} />;
      break;
    case 'sealed':
      if (!g.sealedAt) { page = null; break; }
      page = <Sealed me={g.myName} partner={g.partnerName} link={answersLink(location.origin, myAnswers(g))} model={myModel} land={land}
        hasPartner={!!g.partner} onScan={() => setView({ kind: 'scanAnswers' })} onReveal={() => setView({ kind: 'reveal' })} />;
      break;
    case 'scanAnswers':
      page = <Scanner title={`Scan ${g.partnerName}’s code`} hint={`Point your camera at the code on ${g.partnerName}’s sealed screen.`}
        onClose={() => setView({ kind: 'sealed' })} onText={text => acceptAnswers(g, text)} />;
      break;
    case 'reveal':
    case 'final':
    case 'poster':
      if (!people || !land || !index) { page = <main className="screen"><p className="hint">Getting your worlds ready…</p></main>; break; }
      if (view.kind === 'reveal') page = <Reveal a={people[0]} b={people[1]} questions={g.questions} index={index} land={land}
        onExit={() => setView({ kind: 'sealed' })} onFinal={() => { update({ ...g, revealDone: true }); setView({ kind: 'final' }); }} />;
      else if (view.kind === 'final') page = <Final a={people[0]} b={people[1]} land={land} continentOf={continentOf} onPoster={() => setView({ kind: 'poster' })} />;
      else page = <Poster a={people[0]} b={people[1]} land={land} continentOf={continentOf}
        onBack={() => setView({ kind: 'home' })} onPlayAgain={startNew}
        onClear={() => { clearGame(); setG(null); setView({ kind: 'home' }); }} />;
      break;
  }
  return <>{notices}{page}</>;
}


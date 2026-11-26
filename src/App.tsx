import { useCallback, useEffect, useMemo, useState } from 'react';
import { LISTS, byId, type Act, type Tier } from './data/bank';
import { loadIndex, type City, type CityIndex } from './lib/places/index';
import { loadLand } from './lib/assets';
import { selectQuestions } from './lib/game/select';
import { answersLink, inviteLink, readLink, sharedLink, type Answer, type Invite as InviteData } from './lib/swap/codec';
import { exploreList } from './lib/explore';
import { Explore } from './screens/Explore';
import { buildWorld } from './lib/shape/world';
import { clearGame, countGamePlayed, gamesPlayed, loadGame, myAnswers, randomHex, saveGame, withPartner, withShared, type Game } from './state/game';
import { bothPeople, isJustMet, me, placeCount } from './state/people';
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
  | { kind: 'review' } | { kind: 'sealed' } | { kind: 'scanAnswers' } | { kind: 'reveal' } | { kind: 'final' } | { kind: 'poster' }
  | { kind: 'explore' } | { kind: 'scanShared' };

/** Where someone lands when they come back to a game in progress (F6: reopening resumes). */
function resume(g: Game): View {
  if (g.revealDone) return { kind: 'poster' };
  if (g.sealedAt) return { kind: 'sealed' };
  if (g.role === 0 && !g.started) return { kind: 'invite' };
  const i = g.questions.findIndex(q => !g.answers[q]);
  if (i >= 0) return { kind: 'q', i };
  if (!g.listsDone?.together) return { kind: 'list', which: 'together' };
  // "Just met" skips "Every city we've lived in together" (question sets by tenure)
  if (!g.listsDone?.lived && !isJustMet(g)) return { kind: 'list', which: 'lived' };
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
      if (r.kind === 'shared') {
        if (!cur) return 'Start or join a game first.';
        update(withShared(cur, r.shared));
        setView({ kind: 'explore' });
        return null;
      }
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
    if (!h.startsWith('#j=') && !h.startsWith('#a=') && !h.startsWith('#r=')) return;
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
  const explore = useMemo(() => (g && people ? exploreList({ tier: g.tier, questions: g.questions, a: people[0], b: people[1], been: g.been ?? {}, went: g.went ?? [] }) : []), [g, people]);

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
        const next: Game = { v: 3, gameId, role: 0, myName, partnerName, tier, round: gamesPlayed() + 1, questions: selectQuestions(gameId, tier), answers: {}, together: [], lived: [], createdAt: Date.now() };
        update(next); setView({ kind: 'invite' });
      }} />;
    } else if (view.kind === 'join') {
      const inv = view.invite;
      page = <Join from={inv.from} suggested={inv.to} onJoin={name => {
        const next: Game = { v: 3, gameId: inv.gameId, role: 1, myName: name, partnerName: inv.from, tier: inv.tier, round: inv.round, questions: inv.questions.filter(q => byId.has(q)), answers: {}, together: [], lived: [], started: true, createdAt: Date.now() };
        update(next); setView({ kind: 'q', i: 0 });
      }} />;
    } else if (view.kind === 'scanInvite') {
      page = <Scanner title="Scan your partner’s invite" hint="Point your camera at the code on your partner’s phone."
        onClose={() => setView({ kind: 'home' })}
        onText={text => {
          try { const r = readLink(text); return r.kind === 'invite' ? openInvite(g, r.invite) : 'That code isn’t an invite. Ask your partner for the code on their invite screen.'; }
          catch (e) { return (e as Error).message; }
        }} />;
    } else {
      page = <Landing land={land} status={!g ? 'none' : g.revealDone ? 'finished' : 'playing'} share={!g && location.pathname.startsWith('/s')}
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
        link={inviteLink(location.origin, { gameId: g.gameId, tier: g.tier, round: g.round, from: g.myName, to: g.partnerName, questions: g.questions, indexVersion: index?.version ?? '00000000' })}
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
      page = <Chapter act={view.act} tier={g.tier} model={myModel} land={land} onContinue={() => setView({ kind: 'q', i: view.i })} />;
      break;
    case 'list': {
      const which = view.which;
      const jm = isJustMet(g);
      // "Just met": the first list becomes "Any other places you love?", and the second is skipped
      const list = jm && which === 'together' ? LISTS.loved : LISTS[which];
      page = <ListQuestion key={which} title={list.text} hint={list.hint} step={which === 'together' && !jm ? 'One more' : 'Last one'}
        index={index} initial={g[which]} placesSoFar={placeCount(g)}
        onBack={() => setView(which === 'lived' ? { kind: 'list', which: 'together' } : { kind: 'q', i: g.questions.length - 1 })}
        onDone={ids => {
          if (g.sealedAt) return;
          update({ ...g, [which]: ids, listsDone: { ...g.listsDone, [which]: true } });
          if (fromReview || which === 'lived' || jm) { setFromReview(false); setView({ kind: 'review' }); } else setView({ kind: 'list', which: 'lived' });
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
    case 'explore':
      if (!people || !land || !index) { page = <main className="screen"><p className="hint">Getting your worlds ready…</p></main>; break; }
      if (view.kind === 'reveal') page = <Reveal a={people[0]} b={people[1]} tier={g.tier} round={g.round} questions={g.questions} index={index} land={land}
        been={g.been ?? {}} went={g.went ?? []} onBeen={(key, together) => update({ ...g, been: { ...g.been, [key]: together } })}
        onExit={() => setView({ kind: 'sealed' })} onFinal={() => { if (!g.revealDone) countGamePlayed(); update({ ...g, revealDone: true }); setView({ kind: 'final' }); }} />;
      else if (view.kind === 'final') page = <Final a={people[0]} b={people[1]} land={land} continentOf={continentOf}
        toExplore={explore.filter(e => !e.went).length} onPoster={() => setView({ kind: 'poster' })} />;
      else if (view.kind === 'explore') page = <Explore list={explore} partner={g.partnerName}
        shareLink={sharedLink(location.origin, { gameId: g.gameId, been: g.been ?? {}, went: g.went ?? [] })}
        onWent={(id, went) => update({ ...g, went: went ? [...new Set([...(g.went ?? []), id])] : (g.went ?? []).filter(x => x !== id) })}
        onScan={() => setView({ kind: 'scanShared' })} onBack={() => setView({ kind: 'poster' })} />;
      else page = <Poster a={people[0]} b={people[1]} land={land} continentOf={continentOf} explore={explore}
        onExplore={() => setView({ kind: 'explore' })}
        onBack={() => setView({ kind: 'home' })} onPlayAgain={startNew}
        onClear={() => { clearGame(); setG(null); setView({ kind: 'home' }); }} />;
      break;
    case 'scanShared':
      page = <Scanner title={`Scan ${g.partnerName}’s places to explore`} hint={`On ${g.partnerName}’s phone, open “Your places to explore” and show the code.`}
        onClose={() => setView({ kind: 'explore' })} onText={text => acceptAnswers(g, text)} />;
      break;
  }
  return <>{notices}{page}</>;
}


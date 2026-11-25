import { copy } from '../data/copy';

export function Home({ inProgress, onStart, onContinue, onStartOver }: {
  inProgress: boolean; onStart: () => void; onContinue: () => void; onStartOver: () => void;
}) {
  const share = async () => {
    const url = location.origin;
    try {
      if (navigator.share) await navigator.share({ title: copy.brand, text: 'Play this with me: answer on your phone, I’ll answer on mine.', url });
      else { await navigator.clipboard.writeText(url); alert('Link copied'); }
    } catch { /* cancelled */ }
  };
  return (
    <main className="screen home">
      <p className="eyebrow">A game for two</p>
      <h1 className="display">{copy.brand}</h1>
      <p className="lede">{copy.tagline}</p>
      <ol className="steps">
        <li><span>1</span> Each of you answers 12 quick questions about places in your life, on your own phone. No peeking.</li>
        <li><span>2</span> Seal your answers, then scan each other’s code.</li>
        <li><span>3</span> See what you share, what’s different, and the shape of your world together.</li>
      </ol>
      {inProgress ? (
        <>
          <button className="primary" onClick={onContinue}>Continue</button>
          <button className="link" onClick={onStartOver}>Start over</button>
        </>
      ) : (
        <button className="primary" onClick={onStart}>Start</button>
      )}
      <button className="secondary" onClick={share}>Send this to the person you’re with</button>
      <p className="fine">Your answers stay on your phone. Nothing is sent to us. City data from GeoNames (CC BY 4.0), map from Natural Earth.</p>
    </main>
  );
}

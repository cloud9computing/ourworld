import { useEffect, useRef, useState } from 'react';
import { startScanner } from '../lib/swap/scanner';

/**
 * In-app QR scanner (PRD v2, F8: scanning stays inside the app so the game's saved data is there).
 * `onText` returns an error message to show, or null when the code was accepted.
 */
export function Scanner({ title, hint, onText, onClose }: {
  title: string; hint: string; onText: (text: string) => string | null; onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [noCamera, setNoCamera] = useState(false);
  const [paste, setPaste] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const last = useRef('');

  useEffect(() => {
    let stop: (() => void) | null = null, cancelled = false;
    startScanner(video.current!, text => {
      if (text === last.current) return;
      last.current = text;
      const err = onText(text);
      if (err) setError(err);
    }).then(s => { if (cancelled) s(); else stop = s; }).catch(() => setNoCamera(true));
    return () => { cancelled = true; stop?.(); };
  }, [onText]);

  return (
    <main className="screen scan">
      <div className="topbar"><button className="link" onClick={onClose}>← Back</button><span /></div>
      <h2 className="question small">{title}</h2>
      <p className="hint">{hint}</p>
      <video ref={video} className={noCamera ? 'camera' : 'camera on'} muted playsInline />
      {noCamera && <p className="error">We couldn’t open the camera. Allow camera access for this site, or paste the link below.</p>}
      {error && <p className="error">{error}</p>}
      {showPaste || noCamera ? (
        <div className="paste">
          <textarea value={paste} onChange={e => setPaste(e.target.value)} rows={3} placeholder="https://…" aria-label="Paste a link" />
          <button className="secondary" disabled={!paste.trim()} onClick={() => { const err = onText(paste.trim()); setError(err ?? ''); }}>Use this link</button>
        </div>
      ) : (
        <button className="link center" onClick={() => setShowPaste(true)}>Paste a link instead</button>
      )}
    </main>
  );
}

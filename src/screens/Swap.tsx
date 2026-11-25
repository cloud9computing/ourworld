import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { fromLink, toLink } from '../lib/swap/codec';
import { startScanner } from '../lib/swap/scanner';
import type { PartnerData, Session } from '../state/session';

export function Swap({ s, indexVersion, onPartner, onReveal }: {
  s: Session; indexVersion: string; onPartner: (p: PartnerData) => string | null; onReveal: () => void;
}) {
  const [qr, setQr] = useState('');
  const [myLink, setMyLink] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => {
    const link = toLink(location.origin, { indexVersion, deviceId: s.deviceId, firstName: s.firstName, answers: s.answers, others: s.others });
    setMyLink(link);
    QRCode.toString(link, { type: 'svg', errorCorrectionLevel: 'M', margin: 3, color: { dark: '#000000', light: '#FFFFFF' } }).then(setQr);
  }, [s, indexVersion]);

  useEffect(() => () => stop.current?.(), []);

  const scan = async () => {
    setError('');
    setScanning(true);
    try {
      stop.current = await startScanner(video.current!, text => {
        try {
          const p = fromLink(text);
          const err = onPartner({ deviceId: p.deviceId, firstName: p.firstName, answers: p.answers, others: p.others });
          if (err) { setError(err); return; }
          stop.current?.(); stop.current = null; setScanning(false);
        } catch (e) { setError((e as Error).message); }
      });
    } catch {
      setScanning(false);
      setError('We couldn’t open the camera. Allow camera access for this site, or scan the code with your phone’s camera app.');
    }
  };

  const partner = s.partner;
  return (
    <main className="screen swap">
      {partner ? (
        <>
          <p className="eyebrow">Got it</p>
          <h2 className="question">{partner.firstName}’s answers are in.</h2>
          <p className="hint">If {partner.firstName} hasn’t scanned your code yet, hold it up for them now.</p>
        </>
      ) : (
        <>
          <p className="eyebrow">Sealed</p>
          <h2 className="question">Now swap codes.</h2>
          <p className="hint">Let the other phone scan your code, then scan theirs. The reveal opens once you have their answers.</p>
        </>
      )}
      {!scanning && <div className="qr" data-link={myLink} role="img" aria-label="Your answers as a QR code" dangerouslySetInnerHTML={{ __html: qr }} />}
      <video ref={video} className={scanning ? 'camera on' : 'camera'} />
      {error && <p className="error">{error}</p>}
      {partner ? (
        <button className="primary" onClick={onReveal}>Start the reveal</button>
      ) : scanning ? (
        <button className="secondary" onClick={() => { stop.current?.(); stop.current = null; setScanning(false); }}>Show my code again</button>
      ) : (
        <button className="primary" onClick={scan}>Scan their code</button>
      )}
    </main>
  );
}

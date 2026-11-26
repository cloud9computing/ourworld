import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { copy } from '../data/copy';
import type { WorldModel } from '../lib/shape/world';
import { Chart } from '../components/Chart';

export function Sealed({ me, partner, link, model, land, hasPartner, onScan, onReveal }: {
  me: string; partner: string; link: string; model: WorldModel; land: ArrayLike<number> | null; hasPartner: boolean;
  onScan: () => void; onReveal: () => void;
}) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    QRCode.toString(link, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#05050A', light: '#F4F0E8' } }).then(setQr);
  }, [link]);
  const send = async () => {
    try {
      if (navigator.share) await navigator.share({ title: `${me}’s answers`, url: link });
      else { await navigator.clipboard.writeText(link); alert('Link copied'); }
    } catch { /* cancelled */ }
  };
  return (
    <main className="screen sealed">
      <p className="eyebrow pink center">Sealed</p>
      <h2 className="question center">{copy.yourWorld(me)}</h2>
      {!hasPartner && <div className="sealed-map">{land && <Chart model={model} land={land} mode="a" label={copy.yourWorld(me)} />}</div>}
      <p className="meta center">{copy.sealedCounts(model.counts.a, model.dreams.length)}</p>
      <div className="qr light small" data-link={link} role="img" aria-label="Your answers as a QR code" dangerouslySetInnerHTML={{ __html: qr }} />
      {hasPartner ? (
        <>
          <p className="hint center">{copy.gotAnswers(partner)} {copy.showYours(partner)}</p>
          <button className="primary" onClick={onReveal}>Start the reveal</button>
        </>
      ) : (
        <>
          <p className="hint center">{copy.sealedHint(partner)}</p>
          <button className="primary" onClick={onScan}>Scan {partner}’s code</button>
          <button className="link center" onClick={send}>Send my answers instead</button>
        </>
      )}
    </main>
  );
}

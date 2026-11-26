import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { copy } from '../data/copy';

export function Invite({ partner, link, onStart, onBack }: { partner: string; link: string; onStart: () => void; onBack: () => void }) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    QRCode.toString(link, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#05050A', light: '#F4F0E8' } }).then(setQr);
  }, [link]);
  const send = async () => {
    try {
      if (navigator.share) await navigator.share({ text: copy.inviteShare, url: link });
      else { await navigator.clipboard.writeText(`${copy.inviteShare} ${link}`); alert('Link copied'); }
    } catch { /* cancelled */ }
  };
  return (
    <main className="screen">
      <div className="topbar"><button className="link" onClick={onBack}>← Back</button><span /></div>
      <p className="eyebrow">Step 2 of 2</p>
      <h2 className="question">Bring {partner} in</h2>
      <p className="hint">{copy.inviteLine(partner)}</p>
      <div className="qr light" data-link={link} role="img" aria-label="Invite code" dangerouslySetInnerHTML={{ __html: qr }} />
      <button className="secondary" onClick={send}>Send link instead</button>
      <button className="primary" onClick={onStart}>{copy.partnerIn(partner)}</button>
    </main>
  );
}

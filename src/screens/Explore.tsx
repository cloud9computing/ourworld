import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { copy } from '../data/copy';
import { exploreCount, type ExploreEntry } from '../lib/explore';

/** Places to explore (R4): the list, "We went" ticks, and a code so the other phone keeps the same list. */
export function Explore({ list, partner, shareLink, onWent, onScan, onBack }: {
  list: ExploreEntry[]; partner: string; shareLink: string;
  onWent: (placeId: number, went: boolean) => void; onScan: () => void; onBack: () => void;
}) {
  const [qr, setQr] = useState('');
  const [showCode, setShowCode] = useState(false);
  useEffect(() => {
    if (!showCode) return;
    QRCode.toString(shareLink, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#05050A', light: '#F4F0E8' } }).then(setQr);
  }, [showCode, shareLink]);
  const count = exploreCount(list);
  return (
    <main className="screen explore">
      <div className="topbar"><button className="link" onClick={onBack}>← Back</button><span className="eyebrow pink">{copy.yourPlacesToExplore}</span></div>
      <p className="more-count center">{count}</p>
      <p className="meta center">{count ? copy.toExplore : copy.exploredAll}</p>
      <ul className="explore-list">
        {list.map(e => (
          <li key={e.place.id} className={e.went ? 'went' : ''}>
            <div>
              <span className="city">{e.place.name}</span> <span className="country">{e.place.country}</span>
              <p className="origin">{e.origin}</p>
            </div>
            <button className={`chip ${e.went ? 'on' : ''}`} aria-pressed={e.went} onClick={() => onWent(e.place.id, !e.went)}>{e.went ? `✓ ${copy.weWent}` : copy.weWent}</button>
          </li>
        ))}
      </ul>
      <div className="sync">
        <p className="hint center">Keep the same list on {partner}’s phone.</p>
        {showCode
          ? <div className="qr light small" data-link={shareLink} role="img" aria-label="Places to explore as a QR code" dangerouslySetInnerHTML={{ __html: qr }} />
          : <button className="secondary" onClick={() => setShowCode(true)}>Show the code for {partner}’s phone</button>}
        <button className="link center" onClick={onScan}>Scan the code from {partner}’s phone</button>
      </div>
    </main>
  );
}

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { copy } from '../data/copy';
import { buildWorld } from '../lib/shape/world';
import { FORMATS, posterSvg, type PosterFormat } from '../lib/shape/poster';
import { loadFontCss, svgToPng } from '../lib/assets';
import type { Person } from '../state/people';

export function Poster({ a, b, land, onDone }: { a: Person; b: Person; land: number[]; onDone: () => void }) {
  const [format, setFormat] = useState<PosterFormat>('story');
  const [showNames, setShowNames] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [qrSvg, setQrSvg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const model = useMemo(() => buildWorld(a.world, b.world), [a, b]);
  const link = location.origin;

  useEffect(() => {
    QRCode.toString(link, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#F4F0E8', light: '#00000000' } }).then(setQrSvg);
  }, [link]);

  const opts = { format, names: [a.name, b.name] as [string, string], showNames, showLabels, land, link, qrSvg };
  const preview = useMemo(() => posterSvg(model, opts), [model, format, showNames, showLabels, land, qrSvg]); // eslint-disable-line react-hooks/exhaustive-deps

  const makePng = async () => {
    const fontCss = await loadFontCss();
    const { w, h } = FORMATS[format];
    return svgToPng(posterSvg(model, { ...opts, fontCss }), w, h);
  };

  const share = async () => {
    setBusy(true); setError('');
    try {
      const png = await makePng();
      const file = new File([png], `our-world-${format}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: copy.brand });
      } else {
        download(png, file.name);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message || 'Something went wrong making the poster.');
    } finally { setBusy(false); }
  };

  const save = async () => {
    setBusy(true); setError('');
    try { download(await makePng(), `our-world-${format}.png`); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <main className="screen poster">
      <p className="eyebrow pink">Your poster</p>
      <div className={`poster-preview ${format}`} role="img" aria-label={copy.altText(model.counts.places)} dangerouslySetInnerHTML={{ __html: preview.replace('<svg ', '<svg preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto" ') }} />
      <div className="toggles">
        <div className="seg">
          <button className={format === 'story' ? 'on' : ''} onClick={() => setFormat('story')}>Story</button>
          <button className={format === 'feed' ? 'on' : ''} onClick={() => setFormat('feed')}>Post</button>
        </div>
        <label className="check"><input type="checkbox" checked={showNames} onChange={e => setShowNames(e.target.checked)} /> Show our names</label>
        <label className="check"><input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} /> Show countries</label>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={busy || !qrSvg} onClick={share}>{busy ? 'Making it…' : 'Share'}</button>
      <button className="secondary" disabled={busy || !qrSvg} onClick={save}>Save image</button>
      <button className="link" onClick={() => { if (confirm('Clear everything from this phone? Save your poster first.')) onDone(); }}>We’re done: clear this phone</button>
    </main>
  );
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

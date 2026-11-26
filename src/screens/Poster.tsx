import { useMemo, useState } from 'react';
import { copy } from '../data/copy';
import { buildWorld } from '../lib/shape/world';
import { FORMATS, posterSvg, type PosterFormat } from '../lib/shape/poster';
import { loadFontCss, svgToPng } from '../lib/assets';
import { mentions, type Person } from '../state/people';

export function Poster({ a, b, land, continentOf, onPlayAgain, onClear, onBack }: {
  a: Person; b: Person; land: ArrayLike<number>; continentOf: (cc: string) => string;
  onPlayAgain: () => void; onClear: () => void; onBack: () => void;
}) {
  const [format, setFormat] = useState<PosterFormat>('story');
  const [showNames, setShowNames] = useState(true);
  const [showPlace, setShowPlace] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const model = useMemo(() => buildWorld(a.places, b.places, { continentOf, mentions: mentions(a, b) }), [a, b, continentOf]);
  const link = location.origin;
  const names: [string, string] = [a.name, b.name];
  const preview = useMemo(() => posterSvg(model, { format, names, showNames, showPlace, land, link }), [model, format, showNames, showPlace, land, link]); // eslint-disable-line react-hooks/exhaustive-deps

  const makePng = async () => {
    const fontCss = await loadFontCss();
    const { w, h } = FORMATS[format];
    return svgToPng(posterSvg(model, { format, names, showNames, showPlace, land, link, fontCss }), w, h);
  };
  const run = async (share: boolean) => {
    setBusy(true); setError('');
    try {
      const png = await makePng();
      const name = `our-world-${format}.png`;
      const file = new File([png], name, { type: 'image/png' });
      if (share && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: copy.brand });
      else download(png, name);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message || 'Something went wrong making the poster.');
    } finally { setBusy(false); }
  };

  return (
    <main className="screen poster">
      <div className="topbar"><button className="link" onClick={onBack}>← Back</button><span className="eyebrow pink">Your poster</span></div>
      <div className={`poster-preview ${format}`} role="img" aria-label={copy.altText(model.counts.places, model.share)}
        dangerouslySetInnerHTML={{ __html: preview.replace('<svg ', '<svg preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto" ') }} />
      <div className="toggles">
        <div className="seg">
          <button className={format === 'story' ? 'on' : ''} onClick={() => setFormat('story')}>Story</button>
          <button className={format === 'feed' ? 'on' : ''} onClick={() => setFormat('feed')}>Post</button>
        </div>
        <label className="check"><input type="checkbox" checked={showNames} onChange={e => setShowNames(e.target.checked)} /> Show our names</label>
        {model.featured && <label className="check"><input type="checkbox" checked={showPlace} onChange={e => setShowPlace(e.target.checked)} /> Show {model.featured.name} on the map</label>}
      </div>
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={busy} onClick={() => run(true)}>{busy ? 'Making it…' : 'Share'}</button>
      <button className="secondary" disabled={busy} onClick={() => run(false)}>Save image</button>
      <div className="row">
        <button className="link" onClick={onPlayAgain}>Play again</button>
        <button className="link" onClick={() => { if (confirm('Clear this game from this phone? Save your poster first.')) onClear(); }}>Clear this game</button>
      </div>
    </main>
  );
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const el = document.createElement('a');
  el.href = url; el.download = name;
  document.body.appendChild(el); el.click(); el.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Runtime assets: the land dots and the fonts embedded into exported posters.
import serifUrl from '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2?url';
import monoUrl from '@fontsource/space-mono/files/space-mono-latin-400-normal.woff2?url';
import interUrl from '@fontsource/inter/files/inter-latin-400-normal.woff2?url';
// Content-hashed at build time, like the city list.
import landUrl from '../../data/land.json?url';

let land: Promise<number[]> | null = null;
export function loadLand(): Promise<number[]> {
  land ??= fetch(landUrl).then(r => { if (!r.ok) throw new Error('Could not load the map'); return r.json(); });
  return land;
}

async function dataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = rej; fr.readAsDataURL(blob); });
}

let fontCss: Promise<string> | null = null;
/** @font-face rules with the font files inlined, because an SVG drawn as an image can't load fonts itself. */
export function loadFontCss(): Promise<string> {
  fontCss ??= Promise.all([dataUrl(serifUrl), dataUrl(monoUrl), dataUrl(interUrl)]).then(([serif, mono, inter]) =>
    `@font-face{font-family:'Instrument Serif';font-style:italic;src:url(${serif}) format('woff2')}` +
    `@font-face{font-family:'Space Mono';font-style:normal;src:url(${mono}) format('woff2')}` +
    `@font-face{font-family:'Inter';font-style:normal;font-weight:400;src:url(${inter}) format('woff2')}`);
  return fontCss;
}

/** Draw an SVG string onto a canvas and return a PNG. */
export async function svgToPng(svg: string, width: number, height: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('Could not draw the poster')); img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('Could not save the poster'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

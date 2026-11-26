import { useMemo } from 'react';
import { chartSvg, type ChartMode } from '../lib/shape/chart';
import type { View, WorldModel } from '../lib/shape/world';

let next = 0;

/** One circular chart as inline SVG, sized to its container. */
export function Chart({ model, land, mode, view, progress, pulse, ticks, dreams, label, className }: {
  model: WorldModel; land: ArrayLike<number>; mode: ChartMode; view?: View; progress?: number; pulse?: number;
  ticks?: boolean; dreams?: boolean; label: string; className?: string;
}) {
  const id = useMemo(() => `ch${next++}`, []);
  const svg = useMemo(
    () => chartSvg(model, { cx: 300, cy: 300, r: ticks ? 270 : 296, land, mode, view, progress, pulse, ticks, dreams, id }),
    [model, land, mode, view, progress, pulse, ticks, dreams, id],
  );
  return <svg className={`chart ${className ?? ''}`} viewBox="0 0 600 600" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />;
}

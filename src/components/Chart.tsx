import { useMemo } from 'react';
import { chartSvg, type ChartOptions } from '../lib/shape/poster';
import type { WorldModel } from '../lib/shape/world';

/** The circular chart as an inline SVG, sized to its container. */
export function Chart({ model, land, layers, progress, names, labels = true, label }: {
  model: WorldModel; land: number[]; layers?: ChartOptions['layers']; progress?: number; names: [string, string]; labels?: boolean; label: string;
}) {
  const svg = useMemo(
    () => chartSvg(model, { cx: 300, cy: 300, r: 250, land, names, showLabels: labels, layers, progress, margin: 40 }),
    [model, land, layers, progress, names, labels],
  );
  return <svg className="chart" viewBox="0 0 600 600" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Where the scattered polaroids sit, in `--p`: two staggered columns, and a lone last one in the middle. */
export function scatterSpots(count: number): { x: number; y: number; w: number; rotate: number }[] {
  const tilts = [-5, 4, 3, -6, -3, 5];
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / 2);
    const alone = i === count - 1 && count % 2 === 1;
    if (alone) return { x: 50, y: 40 + row * 66, w: 58, rotate: tilts[i % tilts.length] / 2 };
    return { x: i % 2 === 0 ? 27 : 73, y: 36 + row * 66 + (i % 2 === 0 ? 0 : 13), w: 46, rotate: tilts[i % tilts.length] };
  });
}

/** How tall the scatter is, so the section can make room. */
export const scatterHeight = (count: number): number => (count === 0 ? 0 : Math.ceil(count / 2) * 66 + (count % 2 === 0 ? 24 : 18));

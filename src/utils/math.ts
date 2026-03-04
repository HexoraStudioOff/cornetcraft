/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Smooth step interpolation */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Convert world position to chunk coordinate */
export function worldToChunk(worldPos: number, chunkSize: number): number {
  return Math.floor(worldPos / chunkSize);
}

/** Convert world position to local block coordinate within chunk */
export function worldToLocal(worldPos: number, chunkSize: number): number {
  return ((worldPos % chunkSize) + chunkSize) % chunkSize;
}

/** Hash a chunk coordinate pair for Map keys */
export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

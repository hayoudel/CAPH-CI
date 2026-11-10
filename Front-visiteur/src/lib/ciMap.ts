import data from '../assets/ci-regions.json';

export type MapRegion = { id: string; name: string; path: string; cx: number; cy: number };

export const ciMap = data as {
  viewBox: [number, number];
  projection: { lonMin: number; latMax: number; k: number; scale: number; pad: number };
  source: string;
  regions: MapRegion[];
};

/** Projette une latitude/longitude dans le repère SVG de la carte. */
export function projectPoint(lat: number, lng: number): { x: number; y: number } {
  const { lonMin, latMax, k, scale, pad } = ciMap.projection;
  return { x: (lng - lonMin) * k * scale + pad, y: (latMax - lat) * scale + pad };
}

/**
 * Map visualization utility functions
 */

export interface VisitorLocation {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  visit_count: number;
}

/**
 * Calculate marker radius based on visit count and maximum visits
 */
export const getMarkerRadius = (visitCount: number, maxVisits: number): number => {
  if (maxVisits === 0) return 8;
  // Scale between 6 and 30 pixels based on visit count for more dramatic difference
  const minRadius = 6;
  const maxRadius = 30;
  const normalized = visitCount / maxVisits;
  return minRadius + (normalized * (maxRadius - minRadius));
};

/**
 * Calculate marker opacity based on visit count and maximum visits
 */
export const getMarkerOpacity = (visitCount: number, maxVisits: number): number => {
  if (maxVisits === 0) return 0.6;
  // Scale between 0.4 and 0.9
  const normalized = visitCount / maxVisits;
  return 0.4 + (normalized * 0.5);
};

/**
 * Format location name for popup display
 */
export const formatLocationName = (loc: VisitorLocation): string => {
  const parts = [];
  if (loc.city) parts.push(loc.city);
  if (loc.region && loc.region !== loc.city) parts.push(loc.region);
  if (loc.country) parts.push(loc.country);
  return parts.join(', ') || 'Unknown Location';
};


/**
 * Optimizely SDK configuration
 */

export const OPTIMIZELY_SDK_KEY = 'FjSbvJsioMLDF9gpACwJk';
export const OPTIMIZELY_DATAFILE_URL = 'https://cdn.optimizely.com/datafiles/FjSbvJsioMLDF9gpACwJk.json';

// Feature flag keys
export const FEATURE_FLAGS = {
  INTEGRATIONS_ADOPTION: 'galleria_integrations_adoption',
} as const;

// Feature variable keys for integrations adoption
export const INTEGRATIONS_ADOPTION_VARIABLES = {
  BADGE_COLOR: 'badgeColor',
  HIGHLIGHT_ICONS: 'highlightIcons',
  ICON_HIGHLIGHT_COLOR: 'iconHighlightColor',
  SHOW_BADGES: 'showBadges',
} as const;


// Configuration is managed in config/config.json
// Update config.json to change API URLs for different environments
// This file provides defaults if config.json is not found

import configFile from '../../config/config.json';

const env = import.meta.env.MODE === 'production' ? 'production' : 'development';
const config = configFile[env];

export const API_URL = config.frontend.apiUrl;
export const ANALYTICS_SCRIPT_PATH = configFile.analytics?.scriptPath || '';
export const OPENOBSERVE_CONFIG = {
  enabled: configFile.analytics?.openobserve?.enabled || false,
  endpoint: configFile.analytics?.openobserve?.endpoint || '',
};
export const cacheBustValue = 0; 
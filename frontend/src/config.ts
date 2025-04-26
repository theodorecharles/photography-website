// Development config
const devConfig = {
  apiUrl: 'http://localhost:3001'
};

// Production config
const prodConfig = {
  apiUrl: 'https://api.tedcharles.net'
};

// Use production config if mode is production
export const API_URL = import.meta.env.MODE === 'production' ? prodConfig.apiUrl : devConfig.apiUrl; 
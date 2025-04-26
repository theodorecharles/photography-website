// Development config
const devConfig = {
  apiUrl: 'http://localhost:3001'
};

// Production config
const prodConfig = {
  apiUrl: 'http://localhost:8561'
};

// Export the appropriate config based on environment
export const API_URL = process.env.NODE_ENV === 'production' ? prodConfig.apiUrl : devConfig.apiUrl; 
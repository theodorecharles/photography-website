// Development config
const devConfig = {
  apiUrl: 'http://localhost:3001'
};

// Production config
const prodConfig = {
  apiUrl: 'http://localhost:5173'
};

// Use the appropriate config based on the environment
export const config = process.env.NODE_ENV === 'production' ? prodConfig : devConfig;

// Export the API URL for convenience
export const API_URL = config.apiUrl; 
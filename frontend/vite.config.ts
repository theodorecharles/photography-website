import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from 'fs';
import path from 'path';

// Load config.json to inject values for development mode
const configPath = path.resolve(__dirname, '../config/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const env = process.env.NODE_ENV || 'development';
const envConfig = config[env];

// Derive site URL from API URL
const siteUrl = env === 'production' 
  ? envConfig.frontend.apiUrl.replace('api.', '') 
  : envConfig.frontend.apiUrl.replace(':3001', ':3000');

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "primes-rewrite",
      configureServer(server) {
        server.middlewares.use((req: any, _res: any, next: any) => {
          // Rewrite /primes and /primes/ to /primes/index.html
          if (req.url === "/primes" || req.url === "/primes/") {
            req.url = "/primes/index.html";
          }
          next();
        });
      },
    },
  ],
  define: {
    // Inject config values from config.json for both dev and build
    'import.meta.env.VITE_API_URL': JSON.stringify(envConfig.frontend.apiUrl),
    'import.meta.env.VITE_SITE_URL': JSON.stringify(siteUrl),
    'import.meta.env.VITE_SITE_NAME': JSON.stringify(config.branding.siteName),
    'import.meta.env.VITE_ANALYTICS_ENABLED': JSON.stringify(String(config.analytics?.openobserve?.enabled || false)),
    // Additional values for HTML meta tags
    'import.meta.env.VITE_SITE_URL_FULL': JSON.stringify(siteUrl),
    'import.meta.env.VITE_API_URL_FULL': JSON.stringify(envConfig.frontend.apiUrl),
    'import.meta.env.VITE_AVATAR_PATH': JSON.stringify(config.branding.avatarPath),
  },
  server: {
    host: '127.0.0.1', // Use IPv4 localhost to avoid IPv6 permission issues
    port: envConfig.frontend.devPort || 5173,
    strictPort: false, // Allow fallback to another port if 5173 is in use
  },
});

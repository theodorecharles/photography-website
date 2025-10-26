import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from 'fs';
import path from 'path';

// Load config.json - the single source of truth
const configPath = path.resolve(__dirname, '../config/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const envConfig = config.environment;

// Derive site URL from API URL
// If apiUrl starts with https://, replace api. with www.
// Otherwise (http://localhost), replace :3001 with :3000
const siteUrl = envConfig.frontend.apiUrl.startsWith('https://') 
  ? envConfig.frontend.apiUrl.replace('api.', 'www.').replace('api-', 'www-')
  : envConfig.frontend.apiUrl.replace(/:\d+$/, ':' + envConfig.frontend.port);

// Determine if we should listen on all interfaces (for remote dev)
// Listen on 0.0.0.0 if the apiUrl is not localhost
const isRemoteDev = !envConfig.frontend.apiUrl.includes('localhost');

// Extract HMR host from site URL if remote dev
const hmrHost = isRemoteDev 
  ? new URL(siteUrl).hostname 
  : 'localhost';

console.log('Vite config loaded:');
console.log('  API URL:', envConfig.frontend.apiUrl);
console.log('  Site URL:', siteUrl);
console.log('  Listen host:', isRemoteDev ? '0.0.0.0' : '127.0.0.1');
console.log('  HMR host:', hmrHost);

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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React and React-DOM into their own chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Split recharts (large charting library) into its own chunk
          'recharts-vendor': ['recharts'],
        },
      },
    },
    // Increase chunk size warning limit slightly since we're optimizing
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: isRemoteDev ? '0.0.0.0' : '127.0.0.1',
    port: envConfig.frontend.port,
    strictPort: false,
    hmr: {
      host: hmrHost,
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
});

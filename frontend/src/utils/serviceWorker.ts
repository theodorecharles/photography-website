/**
 * Service Worker registration utility
 * Registers and manages the service worker for caching
 */

import { showToast } from "./toast";

export function registerServiceWorker() {
  // Disable service worker on localhost (development)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('[SW] Service worker disabled on localhost');
    return;
  }
  
  // Only register in production (when served over HTTPS)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      const swUrl = "/sw.js";

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log("✓ Service Worker registered:", registration.scope);

          // Force an immediate update check
          registration.update();

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour

          // Listen for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // New service worker available
                  console.log("📦 New version available! Reloading...");

                  // Show toast notification only in dev/local (not in production)
                  const isProduction =
                    window.location.hostname !== "localhost" &&
                    window.location.hostname !== "127.0.0.1" &&
                    !window.location.hostname.includes("dev");

                  if (!isProduction) {
                    showToast(
                      "📦 New version available! Reloading...",
                      "info"
                    );
                  }
                  
                  // Auto-reload after a brief delay
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000);
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });

      // Listen for messages from the service worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "CACHE_CLEARED") {
          console.log("✓ Cache cleared by service worker");
        }
      });
    });
  }
}

export function unregisterServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error("Service Worker unregistration failed:", error);
      });
  }
}

export function clearServiceWorkerCache() {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "CLEAR_CACHE" });
  }
}

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const configPath = path.join(__dirname, "../config/config.json");
const configFile = JSON.parse(fs.readFileSync(configPath, "utf8"));
const env = process.env.NODE_ENV || "development";
const config = configFile[env];

const app = express();
const port = process.env.PORT || config.frontend.port;

// Security headers middleware
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Enable XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Permissions policy
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );
  // Content Security Policy
  const apiDomain = config.frontend.apiUrl;
  const apiDomainHttps = apiDomain.replace("http://", "https://");
  
  // Get external analytics script host if configured
  const analyticsScriptPath = configFile.analytics?.scriptPath || '';
  const analyticsScriptHost = analyticsScriptPath && analyticsScriptPath.startsWith('http') 
    ? new URL(analyticsScriptPath).origin 
    : '';
  
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    `script-src 'self' 'unsafe-inline' 'unsafe-eval'${analyticsScriptHost ? ' ' + analyticsScriptHost : ''}; ` + // React needs unsafe-inline/eval
    "style-src 'self' 'unsafe-inline'; " +
    "worker-src 'self'; " + // Allow web workers from same origin
    `img-src 'self' ${apiDomainHttps} ${apiDomain} data:; ` +
    `connect-src 'self' ${apiDomainHttps} ${apiDomain}; ` + // No need to allow OpenObserve - backend handles it
    "font-src 'self'; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'none';"
  );
  next();
});

// Allowed hosts for security (prevent open redirect attacks)
const allowedHosts = config.security.allowedHosts;

// HTTPS redirect middleware (only in production)
app.use((req, res, next) => {
  const host = req.get("host");

  // Validate host to prevent open redirect attacks
  if (!allowedHosts.includes(host)) {
    return res.status(400).send("Invalid host header");
  }

  if (
    process.env.NODE_ENV === "production" &&
    req.headers["x-forwarded-proto"] !== "https"
  ) {
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  }
  next();
});

// Domain redirect middleware (optional, for redirecting old domains)
app.use((req, res, next) => {
  const host = req.get("host");
  const redirectFrom = config.security.redirectFrom || [];
  const redirectTo = config.security.redirectTo;

  if (redirectFrom.length > 0 && redirectFrom.includes(host) && redirectTo) {
    return res.redirect(301, `https://${redirectTo}${req.originalUrl}`);
  }
  next();
});

// Serve primes page BEFORE React app (prevents React router from catching it)
// Handle both /primes and /primes/ with directory index support
app.use(
  "/primes",
  express.static(path.join(__dirname, "dist", "primes"), {
    index: "index.html",
  })
);

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, "dist")));

// Handle client-side routing (catch-all for React routes)
// This must come AFTER all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(port, () => {
  console.log(`Frontend server running on port ${port}`);
});

const path = require('path');

module.exports = {
  apps: [
    {
      name: "backend",
      cwd: path.join(__dirname, 'backend'),
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        HOST: "0.0.0.0",
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
    {
      name: "frontend",
      cwd: path.join(__dirname, 'frontend'),
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "0.0.0.0",
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
  ],
};

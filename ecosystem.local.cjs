// PM2 ecosystem config for local development
// Used for running outside Docker
const path = require('path');

const projectRoot = path.resolve(__dirname);
const backendCwd = path.join(projectRoot, 'backend');
const frontendCwd = path.join(projectRoot, 'frontend');
const dataDir = process.env.DATA_DIR || path.join(projectRoot, 'data');
const logsDir = path.join(dataDir, 'logs');

module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: backendCwd,
      script: 'npx',
      args: 'tsx src/server.ts',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        PORT: 3001,
        HOST: process.env.HOST || '0.0.0.0',
        DATA_DIR: dataDir,
      },
      error_file: path.join(logsDir, 'backend-error.log'),
      out_file: path.join(logsDir, 'backend-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: false,
      combine_logs: false,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'frontend',
      cwd: frontendCwd,
      script: 'node',
      args: 'server.js',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        PORT: 3000,
        HOST: process.env.HOST || '0.0.0.0',
        DATA_DIR: dataDir,
        API_URL: process.env.API_URL || 'http://localhost:3001',
      },
      error_file: path.join(logsDir, 'frontend-error.log'),
      out_file: path.join(logsDir, 'frontend-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};


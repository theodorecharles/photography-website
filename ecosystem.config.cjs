// PM2 ecosystem config
// Environment variables are passed from Docker and inherited by PM2
module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: '/app/backend',
      script: 'tsx',
      args: 'src/server.ts',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '0.0.0.0',
        // PM2 will inherit environment variables from the shell
        // DATA_DIR, FRONTEND_DOMAIN, BACKEND_DOMAIN, ALLOWED_ORIGINS set in docker-compose.yml
      },
      error_file: '/data/logs/backend-error.log',
      out_file: '/data/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: false,
      combine_logs: false,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'frontend',
      cwd: '/app/frontend',
      script: 'node',
      args: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',
        // PM2 will inherit environment variables from the shell
        // DATA_DIR, API_URL, BACKEND_DOMAIN set in docker-compose.yml
      },
      error_file: '/data/logs/frontend-error.log',
      out_file: '/data/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      instances: 1,
    },
  ],
};


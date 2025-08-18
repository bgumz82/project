module.exports = {
  apps: [{
    name: 'frota-management',
    script: 'server.cjs',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    kill_timeout: 3000,
    wait_ready: true,
    listen_timeout: 10000,
    restart_delay: 4000,
    max_restarts: 10,
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true,
    time: true,
    windowsHide: true,
    source_map_support: false,
    autorestart: true,
    cron_restart: '0 3 * * *', // Reinicia todos os dias às 3h da manhã
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
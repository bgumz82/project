module.exports = {
  apps: [{
    name: 'frota-management',
    script: 'server.js',
    instances: 'max', // Usa todas as CPUs disponíveis
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 443
    }
  }]
}
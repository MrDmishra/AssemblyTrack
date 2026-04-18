module.exports = {
  apps: [
    {
      name: 'assemblytrack',
      script: 'C:\\Windows\\System32\\cmd.exe',
      args: '/c npx wrangler pages dev dist --ip 0.0.0.0 --port 3000',
      interpreter: 'none',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}

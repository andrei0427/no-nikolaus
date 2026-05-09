module.exports = {
  apps: [
    {
      name: 'no-nikolaus-backend',
      script: 'dist/index.js',
      cwd: '/var/www/no-nikolaus',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};

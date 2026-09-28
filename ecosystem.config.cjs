module.exports = {
  apps: [
    {
      name: "hanu-flood-alert",
      cwd: "/root/hanu-flood-alert",
      script: "/root/.nvm/versions/node/v22.23.3/bin/npm",
      args: "start -- -p 4317 -H 0.0.0.0",
      env: {
        NODE_ENV: "production",
        PORT: "4317"
      },
      autorestart: true,
      max_memory_restart: "500M"
    }
  ]
};

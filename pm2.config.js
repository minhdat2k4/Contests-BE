module.exports = {
  apps: [
    {
      name: "contests-be",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false
    },
  ],
};

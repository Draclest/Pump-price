const port = process.env.BACKEND_PORT || '8000';

module.exports = {
  '/api': {
    target: `http://localhost:${port}`,
    secure: false,
    changeOrigin: true,
  },
};

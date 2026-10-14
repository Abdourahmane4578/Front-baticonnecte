/**
 * Relais /api → Spring. Compatible Vite (ng serve Angular 19+).
 * Retire Origin pour que Spring n'applique pas son filtre CORS.
 */
module.exports = {
  '/api': {
    target: 'http://localhost:8090',
    secure: false,
    changeOrigin: true,
    configure(proxy) {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.removeHeader('origin');
        proxyReq.removeHeader('Origin');
      });
    },
  },
};

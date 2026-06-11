// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    proxy: {
      '/VITE_API_URL': {
        // target: 'http://localhost:3003',
        target:'https://backend-gt0h.onrender.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

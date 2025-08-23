import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@capacitor-community/background-geolocation'],
  },
  build: {
    rollupOptions: {
      external: ['@capacitor-community/background-geolocation'],
    },
  },
});
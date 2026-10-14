import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://ramonpegoretti.github.io/gradesApp/
export default defineConfig({
  base: '/gradesApp/',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 600 },
});

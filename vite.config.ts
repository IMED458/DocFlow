import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: process.env.GITHUB_PAGES === 'true' ? '/DocFlow/' : '/',
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'app.html'),
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR can be disabled in constrained preview environments via DISABLE_HMR.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when HMR is off to save CPU.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (
            id.includes('react-router') ||
            id.includes('react-dom') ||
            id.includes('react/') ||
            id.includes('/react') ||
            id.includes('scheduler')
          ) {
            return 'framework';
          }
          if (id.includes('lucide-react')) return 'icons-vendor';
          if (id.includes('date-fns')) return 'date-vendor';
          if (id.includes('@vis.gl/react-google-maps')) return 'maps-vendor';
        },
      },
    },
  },
  define: {
    'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(process.env.GOOGLE_MAPS_PLATFORM_KEY || ''),
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || '')
  }
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Dev-server headers — production headers are in public/_headers (Netlify/Cloudflare)
    // and must also be configured at the web server / CDN level for other hosts.
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  },
  build: {
    sourcemap: false,
    // Avisa si un chunk supera 800 KB (el default es 500 KB, genera ruido en dev)
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor: React + Router — se cachean juntos porque cambian a la par
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          // Supabase — SDK estable, cambia poco
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          // Excel / SheetJS — solo se usa en importación masiva (rutas admin)
          if (id.includes('node_modules/xlsx') ||
              id.includes('node_modules/exceljs') ||
              id.includes('node_modules/sheetjs')) {
            return 'vendor-excel';
          }
          // Resto de node_modules en un chunk genérico para que no contaminen vendor-react
          if (id.includes('node_modules')) {
            return 'vendor-misc';
          }
        },
      },
    },
  },
});

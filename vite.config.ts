import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createWeatherMiddleware } from './server/weatherMiddleware.js';

function weatherServerPlugin(apiKey: string): Plugin {
  const middleware = createWeatherMiddleware({ apiKey });
  return {
    name: 'weather-server-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        middleware(req, res, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        middleware(req, res, next);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'OPENWEATHER_');
  const apiKey = env.OPENWEATHER_API_KEY || process.env.OPENWEATHER_API_KEY || '';

  return {
    plugins: [react(), weatherServerPlugin(apiKey)],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // leaflet-routing-machine must NOT be split into this chunk: it reads
            // the global `L` at evaluation time, and a separate chunk evaluates
            // before the main chunk's leafletGlobal shim can set window.L.
            if (id.includes('/node_modules/leaflet/')) return 'leaflet';
            if (id.includes('/node_modules/three/')) return 'three';
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      include: [
        'src/standalone/**/*.test.{ts,tsx}',
        'src/components/MapBottomSheet.test.tsx',
        'src/pages/mapRegistration.test.ts',
      ],
    },
  };
});

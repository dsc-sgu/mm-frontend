import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

const profiling = process.env.PROFILING === 'true';

// Serves the MSW worker from the dev server only: production builds ship no
// mock service worker, and the worker always matches the installed msw.
function mockServiceWorker(): Plugin {
  const workerPath = createRequire(import.meta.url).resolve(
    'msw/mockServiceWorker.js'
  );

  return {
    name: 'mock-service-worker',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/mockServiceWorker.js', (_request, response) => {
        response.setHeader('Content-Type', 'text/javascript');
        response.end(readFileSync(workerPath));
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
      }),
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
      tailwindcss(),
      mockServiceWorker(),
    ],
    server: {
      proxy: {
        '/api/v1': {
          target: env.VITE_API_PROXY_TARGET_URL || 'http://localhost:8034',
          changeOrigin: true,

          // TODO: FUEGO??? WTF??? You crash my VITE!!!
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              if (proxyRes.headers['trailer']) {
                delete proxyRes.headers['trailer'];
                delete proxyRes.headers['trailers'];
              }
            });
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),

        ...(profiling
          ? {
              'react-dom/client': 'react-dom/profiling',
            }
          : {}),
      },
    },
    worker: {
      format: 'es',
    },
    build: {
      sourcemap: profiling,
      minify: profiling ? false : 'esbuild',
    },
  };
});

import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

const profiling = process.env.PROFILING === 'true';

const FETCH_LISTENER = "addEventListener('fetch', function (event) {";

// Firefox never runs a module Web Worker whose script a service worker
// answered (mswjs/msw#2654), and MSW answers every request of the pages it
// controls. Worker scripts are left to the browser; requests made by workers
// still reach MSW.
const BYPASS_WORKER_SCRIPTS = `
  if (event.request.destination === 'worker') {
    return
  }
`;

// Serves the MSW worker from the dev server. Production builds ship no mock
// service worker, except a prototype demo build that asks for the mock
// backend (PROTOTYPE). The worker always matches the installed msw.
function mockServiceWorker({ emit }: { emit: boolean }): Plugin {
  const workerPath = createRequire(import.meta.url).resolve(
    'msw/mockServiceWorker.js'
  );

  function readWorkerScript() {
    const script = readFileSync(workerPath, 'utf8');
    if (!script.includes(FETCH_LISTENER)) {
      throw new Error(
        `${workerPath} has no \`${FETCH_LISTENER}\`: update the Firefox ` +
          'worker bypass in vite.config.ts for the installed msw.'
      );
    }

    return script.replace(
      FETCH_LISTENER,
      FETCH_LISTENER + BYPASS_WORKER_SCRIPTS
    );
  }

  return {
    name: 'mock-service-worker',
    generateBundle() {
      if (emit) {
        this.emitFile({
          type: 'asset',
          fileName: 'mockServiceWorker.js',
          source: readWorkerScript(),
        });
      }
    },
    configureServer(server) {
      const workerScript = readWorkerScript();

      server.middlewares.use('/mockServiceWorker.js', (_request, response) => {
        response.setHeader('Content-Type', 'text/javascript');
        response.end(workerScript);
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // PROTOTYPE: the demo build is served under a path, e.g. /mergeminds/.
    base: env.VITE_BASE_PATH || '/',
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
      mockServiceWorker({
        emit:
          env.VITE_PROTOTYPE_DEMO === 'true' &&
          env.VITE_MOCK_BACKEND === 'true',
      }),
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

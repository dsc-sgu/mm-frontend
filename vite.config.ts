import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

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
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
      }),
    ],
    server: {
      proxy: {
        '/api/v1': {
          target: env.VITE_API_PROXY_TARGET_URL || 'http://localhost:8034',
          changeOrigin: true,

          // TODO: FUEGO??? WTF??? You crash my VITE!!!
          configure: (proxy, _options) => {
            proxy.on('proxyRes', (proxyRes, _req, _res) => {
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
      },
    },
  };
});

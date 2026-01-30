
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false, // Отключаем sourcemaps в проде для уменьшения размера
        rollupOptions: {
          // Исключаем серверные файлы из клиентского бандла, если они случайно попали в импорт
          external: ['@neondatabase/serverless', 'bcryptjs', 'jsonwebtoken', 'fs', 'path', 'crypto'],
          output: {
            manualChunks: (id) => {
                if (id.includes('node_modules')) {
                    if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
                    if (id.includes('lucide-react')) return 'vendor-icons';
                    if (id.includes('recharts')) return 'vendor-charts';
                    if (id.includes('zod')) return 'vendor-utils';
                    return 'vendor'; // Все остальное в vendor
                }
            }
          }
        }
      }
    };
});

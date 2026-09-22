import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsChecker from 'vite-plugin-checker'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

const PORT = 4210

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const outDir = env.VITE_OUTPUT_PATH || 'dist'

  return {
    base: env.VITE_BASE_URL || '/',
    logLevel: 'info',
    plugins: [
      react(),
      tailwindcss(),
      tsChecker({ typescript: true }),
      visualizer({
        filename: `${outDir}/stats-treemap.html`,
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      }),
      visualizer({
        filename: `${outDir}/stats-sunburst.html`,
        template: 'sunburst',
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    build: {
      outDir,
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('@mantine')) return 'mantine'
            if (id.includes('@tanstack')) return 'tanstack'
            if (id.includes('/d3') || id.includes('d3-')) return 'd3'
            if (id.includes('@reduxjs') || id.includes('react-redux')) return 'redux'
            if (id.includes('react-router')) return 'react-router'
            if (id.includes('react-resizable-panels')) return 'resizable-panels'
          },
          assetFileNames: assetInfo => {
            let extType = assetInfo.name?.split('.').at(1)
            if (extType && /png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              extType = 'img'
            }
            return `assets/${extType}/[name]-[hash][extname]`
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@tests': path.resolve(__dirname, './tests'),
      },
    },
    server: {
      port: PORT,
      open: true,
    },
    preview: {
      port: PORT,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: 'tests/setup.ts',
      include: ['tests/**/*.test.{ts,tsx}'],
      mockReset: true,
    },
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_APP_ENV),
    },
  }
})

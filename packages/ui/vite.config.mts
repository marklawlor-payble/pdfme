import { readFileSync } from 'node:fs';
import { builtinModules, createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import type { Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const builtinModuleSet = new Set([
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
]);
// pdfjs-dist is external so the ?url import from @pdfme/converter is preserved
// in our dist output. Consumer bundlers then process it: Vite emits the worker as
// a same-origin hashed asset; webpack users can configure asset/resource or call
// setPdfjsWorkerSrc manually.
const isExternal = (id: string) =>
  builtinModuleSet.has(id) || id === 'pdfjs-dist' || id.startsWith('pdfjs-dist/');

// Ships the pre-built pdfjs worker alongside the dist for direct reference.
const shipPdfjsWorker = (): Plugin => ({
  name: 'ship-pdfjs-worker',
  generateBundle() {
    const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs');
    this.emitFile({
      type: 'asset',
      fileName: 'pdf.worker.min.mjs',
      source: readFileSync(workerPath),
    });
  },
});

export default defineConfig(({ mode }) => {
  return {
    base: './',
    define: { 'process.env.NODE_ENV': JSON.stringify(mode) },
    plugins: [react(), cssInjectedByJsPlugin(), shipPdfjsWorker()],
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        fileName: 'index',
        formats: ['es'],
      },
      minify: false,
      outDir: 'dist',
      rollupOptions: { external: isExternal },
      sourcemap: true,
      target: 'es2020',
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'antd'],
      exclude: ['@pdfme/common', '@pdfme/schemas', '@pdfme/converter'],
    },
  };
});

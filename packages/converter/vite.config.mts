import { readFileSync } from 'node:fs';
import { builtinModules, createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const builtinModuleSet = new Set([
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
]);
const packageDependencies = [
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.peerDependencies ?? {}),
];

const isExternal = (id: string) =>
  builtinModuleSet.has(id) ||
  packageDependencies.some((dependency) => id === dependency || id.startsWith(`${dependency}/`));

// Ships the pre-built pdfjs worker alongside the package dist so webpack consumers
// can reference it directly (e.g. via setPdfjsWorkerSrc). Vite consumers get the
// worker automatically via the ?url import handled by their own bundler.
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

export default defineConfig(() => {
  return {
    base: './',
    plugins: [shipPdfjsWorker()],
    build: {
      lib: {
        entry: {
          index: resolve(__dirname, 'src/index.browser.ts'),
          'index.node': resolve(__dirname, 'src/index.node.ts'),
          md2pdf: resolve(__dirname, 'src/md2pdf.ts'),
        },
        fileName: (_, entryName) => `${entryName}.js`,
        formats: ['es'],
      },
      minify: false,
      outDir: 'dist',
      rollupOptions: { external: isExternal },
      sourcemap: true,
      target: 'es2020',
    },
  };
});

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { pdf2img as _pdf2img, Pdf2ImgOptions } from './pdf2img.js';
import { pdf2size as _pdf2size, Pdf2SizeOptions } from './pdf2size.js';
import workerSrc from './pdfjs-worker.js?worker&url';

const clonePdfData = (pdf: ArrayBuffer | Uint8Array) =>
  pdf instanceof Uint8Array ? new Uint8Array(pdf) : new Uint8Array(pdf);

const loadingTaskMap = new WeakMap<object, { destroy: () => Promise<void> }>();

/**
 * Override the PDF.js worker URL used by @pdfme/converter.
 *
 * By default, the converter bundles the PDF.js worker as an inline `data:` URI,
 * which is blocked by strict Content Security Policies that disallow `data:` worker
 * sources (e.g. `worker-src 'self'`).
 *
 * Call this function **before** any PDF rendering to provide a same-origin URL to the
 * PDF.js worker file (e.g. a pre-copied asset served from your own origin):
 *
 * ```ts
 * import { setPdfJsWorkerSrc } from '@pdfme/converter';
 * setPdfJsWorkerSrc('/assets/pdf.worker.min.mjs');
 * ```
 *
 * When not called, the bundled default worker is used as a fallback.
 */
let customWorkerSrc: string | undefined;

export const setPdfJsWorkerSrc = (src: string): void => {
  customWorkerSrc = src;
};

const getDocument = async (pdf: ArrayBuffer | Uint8Array) => {
  if (typeof Worker !== 'undefined') {
    const effectiveWorkerSrc = customWorkerSrc ?? workerSrc;
    if (pdfjsLib.GlobalWorkerOptions.workerSrc !== effectiveWorkerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = effectiveWorkerSrc;
    }
  }

  const loadingTask = pdfjsLib.getDocument({
    data: clonePdfData(pdf),
  });
  const document = await loadingTask.promise;
  loadingTaskMap.set(document, { destroy: () => loadingTask.destroy() });
  return document;
};

const destroyDocument = async (document: object) => {
  const loadingTask = loadingTaskMap.get(document);
  loadingTaskMap.delete(document);
  await loadingTask?.destroy();
};

function dataURLToArrayBuffer(dataURL: string): ArrayBuffer {
  // Split out the actual base64 string from the data URL scheme
  const base64String = dataURL.split(',')[1];

  // Decode the Base64 string to get the binary data
  const byteString = atob(base64String);

  // Create a typed array from the binary string
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uintArray = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uintArray[i] = byteString.charCodeAt(i);
  }

  return arrayBuffer;
}

export const pdf2img = async (
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2ImgOptions = {},
): Promise<ArrayBuffer[]> =>
  _pdf2img(pdf, options, {
    getDocument,
    destroyDocument,
    createCanvas: (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    },
    canvasToArrayBuffer: (canvas, imageType) => {
      // Using type assertion to handle the canvas method
      const dataUrl = (canvas as HTMLCanvasElement).toDataURL(`image/${imageType}`);
      return dataURLToArrayBuffer(dataUrl);
    },
  });

export const pdf2size = async (pdf: ArrayBuffer | Uint8Array, options: Pdf2SizeOptions = {}) =>
  _pdf2size(pdf, options, {
    getDocument,
    destroyDocument,
  });

export { img2pdf } from './img2pdf.js';

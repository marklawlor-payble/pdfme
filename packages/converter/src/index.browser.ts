import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { pdf2img as _pdf2img, Pdf2ImgOptions } from './pdf2img.js';
import { pdf2size as _pdf2size, Pdf2SizeOptions } from './pdf2size.js';
// ?url instructs the consumer's bundler (Vite or webpack with url-loader) to emit
// the worker as a same-origin asset and return its URL — not a data: URI.
// The import is preserved as-is in our dist because pdfjs-dist is external.
import workerSrc from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

export const setPdfjsWorkerSrc = (src: string) => {
  pdfjsLib.GlobalWorkerOptions.workerSrc = src;
};

const clonePdfData = (pdf: ArrayBuffer | Uint8Array) =>
  pdf instanceof Uint8Array ? new Uint8Array(pdf) : new Uint8Array(pdf);

const loadingTaskMap = new WeakMap<object, { destroy: () => Promise<void> }>();

const getDocument = async (pdf: ArrayBuffer | Uint8Array) => {
  if (typeof Worker !== 'undefined' && pdfjsLib.GlobalWorkerOptions.workerSrc !== workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
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
  const base64String = dataURL.split(',')[1];
  const byteString = atob(base64String);
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

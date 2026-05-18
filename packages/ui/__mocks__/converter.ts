import { PAGE_SIZE_PRESETS } from '@pdfme/common';

export const pdf2size = async () => [PAGE_SIZE_PRESETS.A4];

export const pdf2img = async () => [new Uint8Array([137, 80, 78, 71]).buffer];

export const setPdfJsWorkerSrc = (_src: string): void => {
  // no-op in tests; spy on this to verify the option is forwarded
};

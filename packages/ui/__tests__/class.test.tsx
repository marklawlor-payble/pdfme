import React from 'react';
import { vi, beforeEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { BLANK_PDF, type Template, type UIOptions, type UIProps } from '@pdfme/common';
import { BaseUIClass } from '../src/class';

// The UI tests use the converter mock at packages/ui/__mocks__/converter.ts.
// We import setPdfJsWorkerSrc from the same mock path that the vitest config resolves.
import * as converterMock from '@pdfme/converter';

class TestUI extends BaseUIClass {
  public show() {
    this.render();
  }

  protected render() {
    this.mount(<div data-testid="base-ui-mounted">ready</div>);
  }
}

const template: Template = {
  basePdf: BLANK_PDF,
  schemas: [[]],
};

const makeResizeObserverMock = () => {
  class ResizeObserverMock {
    constructor(_callback: ResizeObserverCallback) {}

    public observe() {}
    public unobserve() {}
    public disconnect() {}
  }
  return ResizeObserverMock as unknown as typeof ResizeObserver;
};

test('BaseUIClass mount renders without forcing a synchronous flush', async () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  globalThis.ResizeObserver = makeResizeObserverMock();

  const domContainer = document.createElement('div');
  Object.defineProperty(domContainer, 'clientHeight', { configurable: true, value: 240 });
  Object.defineProperty(domContainer, 'clientWidth', { configurable: true, value: 320 });
  document.body.appendChild(domContainer);

  try {
    const ui = new TestUI({ domContainer, template } as UIProps);

    act(() => {
      ui.show();
    });

    await waitFor(() => {
      expect(domContainer.querySelector('[data-testid="base-ui-mounted"]')).toBeInTheDocument();
    });

    ui.destroy();
  } finally {
    domContainer.remove();
    globalThis.ResizeObserver = originalResizeObserver;
  }
});

describe('pdfJsWorkerSrc option', () => {
  let originalResizeObserver: typeof ResizeObserver;
  let domContainer: HTMLDivElement;

  beforeEach(() => {
    originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = makeResizeObserverMock();
    domContainer = document.createElement('div');
    Object.defineProperty(domContainer, 'clientHeight', { configurable: true, value: 240 });
    Object.defineProperty(domContainer, 'clientWidth', { configurable: true, value: 320 });
    document.body.appendChild(domContainer);
  });

  afterEach(() => {
    domContainer.remove();
    globalThis.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
  });

  it('calls setPdfJsWorkerSrc with the provided URL when constructing BaseUIClass', () => {
    const spy = vi.spyOn(converterMock, 'setPdfJsWorkerSrc');
    const customSrc = '/assets/pdf.worker.min.mjs';

    const ui = new TestUI({
      domContainer,
      template,
      options: { pdfJsWorkerSrc: customSrc } as UIOptions,
    } as UIProps);

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith(customSrc);

    ui.destroy();
  });

  it('does not call setPdfJsWorkerSrc when pdfJsWorkerSrc is not provided', () => {
    const spy = vi.spyOn(converterMock, 'setPdfJsWorkerSrc');

    const ui = new TestUI({ domContainer, template } as UIProps);

    expect(spy).not.toHaveBeenCalled();

    ui.destroy();
  });

  it('calls setPdfJsWorkerSrc when updateOptions is called with pdfJsWorkerSrc', () => {
    const ui = new TestUI({ domContainer, template } as UIProps);
    const spy = vi.spyOn(converterMock, 'setPdfJsWorkerSrc');
    const customSrc = '/assets/pdf.worker.v2.mjs';

    ui.updateOptions({ pdfJsWorkerSrc: customSrc } as UIOptions);

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith(customSrc);

    ui.destroy();
  });
});

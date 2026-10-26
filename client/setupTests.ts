import '@testing-library/jest-dom';
import { cleanup } from "@testing-library/react";
afterEach(() => {
  cleanup();
});

// Polyfills for Radix UI + JSDOM
if (typeof window !== 'undefined') {
  // PointerEvent polyfill for components that rely on it
  if (!('PointerEvent' in window)) {
    // Polyfilling PointerEvent
    (window as Window & { PointerEvent: typeof MouseEvent }).PointerEvent = MouseEvent as unknown as typeof PointerEvent;
  }
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false;
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => {};
  }

  // Some components call scrollIntoView on options/items; provide a no-op in JSDOM
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }
}

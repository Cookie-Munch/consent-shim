/**
 * `import '@cookiemunch/consent-shim'` sets `window.__fdConsent` on a page that does not run Cookie
 * Munch (Cookiebot, OneTrust or no consent tool), exactly as the CDN's fd-consent-shim.js does. On a
 * page where a consent tool already set the real object it does nothing.
 */
import './shim.js';

export {};

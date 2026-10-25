# Changelog: @cookiemunch/consent-shim

Every published release, newest first. Dates are the day the version was cut.

## 0.2.0 (2026-10-25)

- Added: the shim also sets `window.__consent`, the shared API's name from now on; `window.__fdConsent` stays, the same object. Calls queued on either are replayed, and a `__consent` another tool owns is left alone.

## 0.1.0 (2026-10-24)

- Added: `import '@cookiemunch/consent-shim'` sets `window.__fdConsent` over Cookiebot, OneTrust or no consent tool; `dist/fd-consent-shim.js` is the same script as the CDN's.

# @cookiemunch/consent-shim

`window.__fdConsent` on any page: one small consent API that a chat widget, a referral snippet or an
analytics tag can code against, whatever consent tool the page runs. Cookie Munch sets it natively;
on a page running Cookiebot, OneTrust or no consent tool, this shim sets the same object.

```ts
import '@cookiemunch/consent-shim';

const fd = window.__fdConsent;
fd.has('referrals');                       // true, false, or null before the visitor decides
fd.on('change', (state) => { /* … */ });
await fd.request('support_chat');          // the mapped category's state (the shim cannot prompt)
```

Or as a script tag, from the CDN or from this package's `dist/fd-consent-shim.js`:

```html
<script src="https://cdn.cookiemunch.net/fd-consent-shim.js" async></script>
```

It maps the tool's categories onto `preferences`, `statistics` and `marketing`, then
`support_chat` → `preferences`, `referrals` → `marketing` and `product_analytics` → `statistics`.
Change the mapping before it loads with `window.fdConsentShim = { map: { referrals: 'statistics' } }`.
With no consent tool every category is allowed, except what a Global Privacy Control signal refuses.
Do not load it on a Cookie Munch site.

Docs: [cookiemunch.net/docs/consent-api](https://cookiemunch.net/docs/consent-api).

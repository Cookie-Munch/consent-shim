/**
 * fd-consent-shim.js (CMU-X18): `window.__fdConsent` on a site that does NOT run Cookie Munch —
 * Cookiebot, OneTrust, or no CMP at all (GPC only) — so a chat widget or a referral snippet
 * codes against one API wherever it is embedded.
 *
 *   <script src="https://cdn.cookiemunch.net/fd-consent-shim.js" async></script>
 *
 * It maps the CMP's categories onto the standard ids, and the reserved ids onto those:
 * `support_chat` → preferences, `referrals` → marketing, `product_analytics` → statistics (change with
 * `window.fdConsentShim = { map: { referrals: 'statistics' } }` before it loads). It cannot
 * prompt, so `request()` answers with the mapped category's state; `layout` answers 0;
 * `identify` does nothing. With no CMP there is nothing to decide: every category is allowed
 * except where Global Privacy Control says no (marketing, and what maps to it).
 *
 * Do not load it on a Cookie Munch site: Cookie Munch sets the native object itself.
 * Standalone and tiny (size-gated): it imports nothing.
 */

type Cats = Record<string, boolean>;
type Cb = (s: unknown, cause: string) => void;

((w: Window & Record<string, any>) => {
  const fd = w.__fdConsent;
  if (fd && fd.version) return; // a CMP already set the real one
  const queued: unknown[][] = (fd && fd.q) || [];
  const map: Record<string, string> = { support_chat: 'preferences', referrals: 'marketing', product_analytics: 'statistics', ...(w.fdConsentShim && w.fdConsentShim.map) };
  const std = ['preferences', 'statistics', 'marketing'];
  const gpc = (): boolean => !!(w.navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;

  /** What the CMP on the page says now: [provider, decided, required, categories]. */
  const read = (): [string, boolean, boolean, Cats] => {
    const cb = w.Cookiebot;
    if (cb && cb.consent && typeof cb.hasResponse == 'boolean') {
      const c = cb.consent;
      return ['cookiebot', cb.hasResponse, true, { preferences: !!c.preferences, statistics: !!c.statistics, marketing: !!c.marketing }];
    }
    const groups: unknown = w.OnetrustActiveGroups;
    if (typeof groups == 'string') {
      const on = (g: string): boolean => groups.indexOf(`,${g},`) >= 0;
      const closed = /(^|; )OptanonAlertBoxClosed=/.test(document.cookie);
      return ['onetrust', closed, true, { preferences: on('C0003'), statistics: on('C0002'), marketing: on('C0004') }];
    }
    return ['none', false, false, { preferences: true, statistics: true, marketing: !gpc() }];
  };

  const snapshot = () => {
    const [, decided, required, c] = read();
    const categories: Cats = { necessary: true, ...c };
    for (const id in map) categories[id] = !!c[map[id]!];
    return { decided, required, categories, stamp: null, region: '', gpc: gpc(), decidedAt: null };
  };
  const settled = (): boolean => {
    const r = read();
    return r[1] || !r[2];
  };
  const warned: Record<string, 1> = {};
  const has = (cat: string): boolean | null => {
    if (cat == 'necessary') return true;
    const id = std.indexOf(cat) >= 0 ? cat : map[cat];
    if (!id) {
      if (!warned[cat]) (warned[cat] = 1), console.warn(`[fd-consent-shim] unknown category "${cat}"; answering false`);
      return false;
    }
    return settled() ? !!read()[3][id] : null;
  };

  const listeners: Cb[] = [];
  const emit = (cause: string): void => {
    const s = snapshot();
    listeners.slice().forEach((cb) => {
      try {
        cb(s, cause);
      } catch (e) {
        console.error(e);
      }
    });
  };
  // Cookiebot's events, and OneTrust's; whichever CMP the page runs fires its own.
  w.addEventListener('CookiebotOnAccept', () => emit('accept'));
  w.addEventListener('CookiebotOnDecline', () => emit('decline'));
  w.addEventListener('OneTrustGroupsUpdated', () => emit('selection'));

  const on = (ev: string, cb: Cb): (() => void) => {
    if (ev != 'change' || typeof cb != 'function') return () => undefined;
    listeners.push(cb);
    if (settled()) Promise.resolve().then(() => listeners.indexOf(cb) >= 0 && cb(snapshot(), 'replay'));
    return () => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    };
  };
  const ready = () =>
    new Promise((done) => {
      if (settled()) return done(snapshot());
      const off = on('change', (s) => (off(), done(s)));
    });

  const api: Record<string, any> = {
    version: 1,
    get provider() {
      return `shim:${read()[0]}`;
    },
    has,
    on,
    ready,
    // It cannot ask: the answer is the mapped category's state (false while undecided).
    request: (cat: string) => Promise.resolve(has(cat) === true),
    identify: () => undefined,
    layout: { bottomInset: () => 0, on: () => () => undefined },
  };
  const run = (c: unknown[]): void => {
    const [m, a, b, d] = c as [string, any, any, any];
    if (m == 'on') on(a, b);
    else if (m == 'ready') ready().then(a);
    else if (m == 'request') api.request(a).then(d);
  };
  api.q = { push: (...calls: unknown[][]) => (calls.forEach(run), 0) };
  w.__fdConsent = api;
  queued.forEach(run);
})(window as never);

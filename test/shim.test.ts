// @vitest-environment happy-dom
/**
 * CMU-X18: fd-consent-shim.js gives a page running Cookiebot, OneTrust or no CMP the same
 * window.__fdConsent contract Cookie Munch provides natively.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const w = window as unknown as Record<string, any>;
const tick = () => new Promise((r) => setTimeout(r, 0));
async function loadShim(): Promise<any> {
  vi.resetModules();
  await import('../src/shim.js');
  return w.__fdConsent;
}

beforeEach(() => {
  for (const k of ['__consent', '__fdConsent', 'Cookiebot', 'OnetrustActiveGroups', 'fdConsentShim', 'CookieMunch']) delete w[k];
  document.cookie = 'OptanonAlertBoxClosed=; max-age=0; path=/';
  Object.defineProperty(navigator, 'globalPrivacyControl', { value: undefined, configurable: true });
});

describe('over Cookiebot', () => {
  it('has() is tri-state: null before the visitor answers, then the mapped answer', async () => {
    w.Cookiebot = { hasResponse: false, consent: { preferences: false, statistics: false, marketing: false } };
    const fd = await loadShim();
    expect(fd.version).toBe(1);
    expect(fd.provider).toBe('shim:cookiebot');
    expect(fd.has('referrals')).toBeNull();
    expect(fd.has('necessary')).toBe(true);
    w.Cookiebot = { hasResponse: true, consent: { preferences: true, statistics: false, marketing: true } };
    expect(fd.has('referrals')).toBe(true); // → marketing
    expect(fd.has('support_chat')).toBe(true); // → preferences
    expect(fd.has('statistics')).toBe(false);
  });

  it('on(change) fires on Cookiebot’s own events; ready() waits for the answer', async () => {
    w.Cookiebot = { hasResponse: false, consent: { preferences: false, statistics: false, marketing: false } };
    const fd = await loadShim();
    const seen: string[] = [];
    fd.on('change', (_s: unknown, cause: string) => seen.push(cause));
    let ready: any = null;
    fd.ready().then((s: unknown) => (ready = s));
    w.Cookiebot = { hasResponse: true, consent: { preferences: false, statistics: false, marketing: true } };
    window.dispatchEvent(new Event('CookiebotOnAccept'));
    await tick();
    expect(seen).toEqual(['accept']);
    expect(ready.categories).toMatchObject({ marketing: true, referrals: true, support_chat: false });
  });

  it('request() cannot prompt: it answers the mapped state', async () => {
    w.Cookiebot = { hasResponse: true, consent: { preferences: false, statistics: false, marketing: false } };
    const fd = await loadShim();
    await expect(fd.request('referrals', { reason: 'r', vendor: 'x' })).resolves.toBe(false);
    expect(fd.layout.bottomInset()).toBe(0);
  });
});

describe('over OneTrust', () => {
  it('maps C0002/C0003/C0004 and reads the closed banner as decided', async () => {
    w.OnetrustActiveGroups = ',C0001,C0003,';
    const fd = await loadShim();
    expect(fd.has('preferences')).toBeNull();
    document.cookie = 'OptanonAlertBoxClosed=2026-10-23; path=/';
    expect(fd.has('support_chat')).toBe(true);
    expect(fd.has('referrals')).toBe(false);
  });
});

describe('with no CMP', () => {
  it('nothing to decide: allowed, except what GPC refuses', async () => {
    const fd = await loadShim();
    expect(fd.provider).toBe('shim:none');
    expect(fd.has('referrals')).toBe(true);
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
    expect(fd.has('referrals')).toBe(false);
    expect(fd.has('support_chat')).toBe(true);
    expect((await fd.ready()).required).toBe(false);
  });
});

describe('the queue and the map', () => {
  it('replays an embed’s queued calls and takes a custom map', async () => {
    const changes: string[] = [];
    w.fdConsentShim = { map: { referrals: 'statistics' } };
    w.Cookiebot = { hasResponse: true, consent: { preferences: false, statistics: true, marketing: false } };
    w.__fdConsent = { q: [['on', 'change', (_s: unknown, c: string) => changes.push(c)]] };
    const fd = await loadShim();
    await tick();
    expect(changes).toEqual(['replay']);
    expect(fd.has('referrals')).toBe(true);
    fd.q.push(['on', 'change', (_s: unknown, c: string) => changes.push(`late:${c}`)]);
    await tick();
    expect(changes).toContain('late:replay');
  });

  it('leaves a real __fdConsent alone', async () => {
    const real = { version: 1, has: () => true };
    w.__fdConsent = real;
    await loadShim();
    expect(w.__fdConsent).toBe(real);
  });
});

describe('window.__consent, with __fdConsent as an alias', () => {
  it('sets both names to one object and replays what was queued on either', async () => {
    const seen: string[] = [];
    w.__consent = { q: [['ready', () => seen.push('consent')]] };
    const fd = await loadShim();
    await tick();
    expect(w.__consent).toBe(fd);
    expect(seen).toEqual(['consent']);
  });

  it('leaves a __consent another tool owns alone', async () => {
    const theirs = { mine: true };
    w.__consent = theirs;
    await loadShim();
    expect(w.__consent).toBe(theirs);
    expect(w.__fdConsent.version).toBe(1);
  });
});

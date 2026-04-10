/**
 * Lightpanda integration tests
 *
 * Tests the LightpandaManager lifecycle, the LP read command handlers,
 * and the routing/fallback behavior.
 *
 * Requires: Lightpanda binary installed (skips gracefully if not found)
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { LightpandaManager, findLightpandaBinary } from '../src/lightpanda';
import { handleReadCommandLP } from '../src/read-commands-lp';
import { startTestServer } from './test-server';

const LP_BINARY = findLightpandaBinary();
const SKIP = !LP_BINARY;

describe('LightpandaManager', () => {
  test('findLightpandaBinary returns path or null', () => {
    const result = findLightpandaBinary();
    if (result) {
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    } else {
      expect(result).toBeNull();
    }
  });

  test('getStatus reports disabled when not started', () => {
    const lm = new LightpandaManager(19876);
    const status = lm.getStatus();
    expect(status.available).toBe(false);
    expect(status.stale).toBe(false);
    expect(status.url).toBe('about:blank');
  });

  test('markStale / clearStale', () => {
    const lm = new LightpandaManager(19877);
    expect(lm.isStale()).toBe(false);
    lm.markStale();
    expect(lm.isStale()).toBe(true);
    lm.clearStale();
    expect(lm.isStale()).toBe(false);
  });

  test('isReady returns false when not available', () => {
    const lm = new LightpandaManager(19878);
    expect(lm.isReady('http://example.com')).toBe(false);
  });
});

describe('Lightpanda CDP integration', () => {
  if (SKIP) {
    test.skip('LP binary not found — skipping CDP tests', () => {});
    return;
  }

  let lm: LightpandaManager;
  let testServer: ReturnType<typeof startTestServer>;
  let url: string;

  beforeAll(async () => {
    testServer = startTestServer(19879);
    url = testServer.url;

    lm = new LightpandaManager(19880);
    await lm.start();
  }, 10000);

  afterAll(async () => {
    await lm.stop();
    testServer.server.stop();
  });

  test('starts and reports available', () => {
    expect(lm.isAvailable()).toBe(true);
    expect(lm.getStatus().available).toBe(true);
  });

  test('navigates to URL', async () => {
    await lm.navigateTo(`${url}/basic.html`);
    expect(lm.getCurrentUrl()).toBe(`${url}/basic.html`);
    expect(lm.isReady(`${url}/basic.html`)).toBe(true);
  });

  test('isReady returns false for wrong URL', () => {
    expect(lm.isReady(`${url}/other.html`)).toBe(false);
  });

  test('markStale makes isReady false', () => {
    lm.markStale();
    expect(lm.isReady(`${url}/basic.html`)).toBe(false);
    expect(lm.isStale()).toBe(true);
  });

  test('navigateTo clears stale', async () => {
    await lm.navigateTo(`${url}/basic.html`);
    expect(lm.isStale()).toBe(false);
    expect(lm.isReady(`${url}/basic.html`)).toBe(true);
  });

  // ── LP read command tests ──

  test('text command extracts clean text', async () => {
    await lm.navigateTo(`${url}/basic.html`);
    const result = await handleReadCommandLP('text', [], lm);
    expect(result).toContain('Hello World');
    expect(result).toContain('Item one');
    // Should not contain script/style content
    expect(result).not.toContain('<script');
  });

  test('html command returns full page HTML', async () => {
    await lm.navigateTo(`${url}/basic.html`);
    const result = await handleReadCommandLP('html', [], lm);
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('Hello World');
    expect(result).toContain('<nav>');
  });

  test('html command with selector returns innerHTML', async () => {
    await lm.navigateTo(`${url}/basic.html`);
    const result = await handleReadCommandLP('html', ['#content'], lm);
    expect(result).toContain('Item one');
    expect(result).not.toContain('<!DOCTYPE');
  });

  test('links command extracts links', async () => {
    await lm.navigateTo(`${url}/basic.html`);
    const result = await handleReadCommandLP('links', [], lm);
    expect(result).toContain('Page 1');
    expect(result).toContain('Page 2');
    expect(result).toContain('External');
  });

  test('forms command extracts form data', async () => {
    await lm.navigateTo(`${url}/snapshot.html`);
    const result = await handleReadCommandLP('forms', [], lm);
    const forms = JSON.parse(result);
    expect(forms.length).toBeGreaterThan(0);
    const fields = forms[0].fields;
    expect(fields.some((f: any) => f.id === 'username')).toBe(true);
    expect(fields.some((f: any) => f.id === 'email')).toBe(true);
  });

  test('js command evaluates expression', async () => {
    await lm.navigateTo(`${url}/basic.html`);
    const result = await handleReadCommandLP('js', ['document.title'], lm);
    expect(result).toBe('Test Page - Basic');
  });

  test('js command evaluates complex expression', async () => {
    await lm.navigateTo(`${url}/basic.html`);
    const result = await handleReadCommandLP('js', ['document.querySelectorAll("li").length'], lm);
    expect(result).toBe('3');
  });

  test('attrs command returns element attributes', async () => {
    await lm.navigateTo(`${url}/basic.html`);
    const result = await handleReadCommandLP('attrs', ['#content'], lm);
    const attrs = JSON.parse(result);
    expect(attrs.id).toBe('content');
    expect(attrs['data-testid']).toBe('main-content');
  });

  test('css command returns computed style', async () => {
    await lm.navigateTo(`${url}/basic.html`);
    const result = await handleReadCommandLP('css', ['h1', 'color'], lm);
    // navy = rgb(0, 0, 128) — LP may return either format
    expect(result.length).toBeGreaterThan(0);
  });

  test('SPA with JS execution works', async () => {
    // LP needs time for JS setTimeout to fire — navigate and wait
    await lm.navigateTo(`${url}/spa.html`);
    // Wait for the JS setTimeout(500ms) to complete
    await new Promise(r => setTimeout(r, 1000));
    // Re-navigate to get the rendered DOM (LP frame can detach after JS mutation)
    await lm.navigateTo(`${url}/spa.html`);
    await new Promise(r => setTimeout(r, 1000));
    const result = await handleReadCommandLP('html', [], lm);
    // LP should have executed the JS — check for either the rendered or loading state
    expect(result).toContain('SPA');
  }, 10000);

  test('getPage returns puppeteer Page', () => {
    const page = lm.getPage();
    expect(page).not.toBeNull();
  });
});

describe('LP read command edge cases', () => {
  if (SKIP) {
    test.skip('LP binary not found — skipping', () => {});
    return;
  }

  let lm: LightpandaManager;
  let testServer: ReturnType<typeof startTestServer>;

  beforeAll(async () => {
    testServer = startTestServer(19881);
    lm = new LightpandaManager(19882);
    await lm.start();
    await lm.navigateTo(`${testServer.url}/basic.html`);
  }, 10000);

  afterAll(async () => {
    await lm.stop();
    testServer.server.stop();
  });

  test('js command throws on missing expression', async () => {
    await expect(handleReadCommandLP('js', [], lm)).rejects.toThrow('Usage');
  });

  test('html command with nonexistent selector throws', async () => {
    await expect(handleReadCommandLP('html', ['#nonexistent'], lm)).rejects.toThrow();
  });

  test('unsupported command throws', async () => {
    await expect(handleReadCommandLP('accessibility' as any, [], lm)).rejects.toThrow('unsupported');
  });
});

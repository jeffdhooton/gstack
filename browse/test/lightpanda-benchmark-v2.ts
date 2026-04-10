#!/usr/bin/env bun
/**
 * Lightpanda vs Playwright benchmark v2
 *
 * Tests persistent CDP mode (no spawn overhead) and bulk scraping.
 *
 * Requires:
 *   bun browse/test/test-server.ts    (port 9450)
 *   /tmp/lightpanda serve --port 9333 (CDP server)
 */

import { chromium, type BrowserContext, type Browser } from 'playwright';
import puppeteer, { type Browser as PBrowser } from 'puppeteer-core';

const LP_WS = 'ws://127.0.0.1:9333/';
const BASE = 'http://127.0.0.1:9450';
const N = 10; // iterations per test

interface Result {
  test: string;
  engine: string;
  times: number[];
  median: number;
  success: boolean;
  note?: string;
}

function med(a: number[]) {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function p95(a: number[]) {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length * 0.95)];
}

async function main() {
  console.log('=== Lightpanda CDP vs Playwright — Persistent Mode ===\n');

  // Connect to both engines
  const t0 = performance.now();
  const lpBrowser = await puppeteer.connect({ browserWSEndpoint: LP_WS });
  const lpConnectMs = performance.now() - t0;
  console.log(`Lightpanda CDP connect: ${lpConnectMs.toFixed(0)}ms`);

  const t1 = performance.now();
  const pwBrowser = await chromium.launch({ headless: true });
  const pwCtx = await pwBrowser.newContext();
  const pwLaunchMs = performance.now() - t1;
  console.log(`Playwright launch: ${pwLaunchMs.toFixed(0)}ms\n`);

  // Warm up both
  const lpWarm = await lpBrowser.newPage();
  await lpWarm.goto(`${BASE}/basic.html`); await lpWarm.close();
  const pwWarm = await pwCtx.newPage();
  await pwWarm.goto(`${BASE}/basic.html`); await pwWarm.close();

  const results: Result[] = [];

  // ═══ PART 1: Individual operations (persistent mode) ═══
  console.log('── Part 1: Individual Operations (10 iterations each) ──\n');

  // 1a. HTML extraction — LP CDP
  console.log('1. HTML extraction');
  {
    const times: number[] = [];
    let ok = false;
    for (let i = 0; i < N; i++) {
      const s = performance.now();
      const p = await lpBrowser.newPage();
      await p.goto(`${BASE}/basic.html`, { waitUntil: 'domcontentloaded' });
      const html = await p.content();
      await p.close();
      times.push(performance.now() - s);
      ok = html.includes('Hello World');
    }
    results.push({ test: 'HTML extraction', engine: 'LP CDP', times, median: med(times), success: ok });
  }
  {
    const times: number[] = [];
    let ok = false;
    for (let i = 0; i < N; i++) {
      const s = performance.now();
      const p = await pwCtx.newPage();
      await p.goto(`${BASE}/basic.html`);
      const html = await p.content();
      await p.close();
      times.push(performance.now() - s);
      ok = html.includes('Hello World');
    }
    results.push({ test: 'HTML extraction', engine: 'Playwright', times, median: med(times), success: ok });
  }

  // 2. Text extraction
  console.log('2. Text extraction');
  {
    const times: number[] = [];
    let ok = false;
    for (let i = 0; i < N; i++) {
      const s = performance.now();
      const p = await lpBrowser.newPage();
      await p.goto(`${BASE}/basic.html`, { waitUntil: 'domcontentloaded' });
      const text = await p.evaluate(() => document.body.innerText);
      await p.close();
      times.push(performance.now() - s);
      ok = (text || '').includes('Hello World');
    }
    results.push({ test: 'Text extraction', engine: 'LP CDP', times, median: med(times), success: ok });
  }
  {
    const times: number[] = [];
    let ok = false;
    for (let i = 0; i < N; i++) {
      const s = performance.now();
      const p = await pwCtx.newPage();
      await p.goto(`${BASE}/basic.html`);
      const text = await p.innerText('body');
      await p.close();
      times.push(performance.now() - s);
      ok = text.includes('Hello World');
    }
    results.push({ test: 'Text extraction', engine: 'Playwright', times, median: med(times), success: ok });
  }

  // 3. JS evaluation
  console.log('3. JS evaluation (DOM query)');
  {
    const times: number[] = [];
    let ok = false;
    for (let i = 0; i < N; i++) {
      const s = performance.now();
      const p = await lpBrowser.newPage();
      await p.goto(`${BASE}/snapshot.html`, { waitUntil: 'domcontentloaded' });
      const data = await p.evaluate(() => JSON.stringify({
        title: document.title,
        inputs: Array.from(document.querySelectorAll('input')).map(el => el.id),
        buttons: Array.from(document.querySelectorAll('button')).map(el => el.textContent),
        links: Array.from(document.querySelectorAll('a')).map(a => a.href),
      }));
      await p.close();
      times.push(performance.now() - s);
      ok = data.includes('username');
    }
    results.push({ test: 'JS eval (DOM)', engine: 'LP CDP', times, median: med(times), success: ok });
  }
  {
    const times: number[] = [];
    let ok = false;
    for (let i = 0; i < N; i++) {
      const s = performance.now();
      const p = await pwCtx.newPage();
      await p.goto(`${BASE}/snapshot.html`);
      const data = await p.evaluate(() => JSON.stringify({
        title: document.title,
        inputs: Array.from(document.querySelectorAll('input')).map(el => el.id),
        buttons: Array.from(document.querySelectorAll('button')).map(el => el.textContent),
        links: Array.from(document.querySelectorAll('a')).map(a => a.href),
      }));
      await p.close();
      times.push(performance.now() - s);
      ok = data.includes('username');
    }
    results.push({ test: 'JS eval (DOM)', engine: 'Playwright', times, median: med(times), success: ok });
  }

  // 4. SPA with JS rendering
  console.log('4. SPA (JS render)');
  {
    const times: number[] = [];
    let ok = false;
    for (let i = 0; i < N; i++) {
      const s = performance.now();
      const p = await lpBrowser.newPage();
      await p.goto(`${BASE}/spa.html`, { waitUntil: 'load' });
      // Wait for JS to render
      await p.waitForSelector('.loaded', { timeout: 5000 }).catch(() => {});
      const html = await p.content();
      await p.close();
      times.push(performance.now() - s);
      ok = html.includes('SPA Content Loaded');
    }
    results.push({ test: 'SPA render', engine: 'LP CDP', times, median: med(times), success: ok });
  }
  {
    const times: number[] = [];
    let ok = false;
    for (let i = 0; i < N; i++) {
      const s = performance.now();
      const p = await pwCtx.newPage();
      await p.goto(`${BASE}/spa.html`);
      await p.waitForSelector('.loaded', { timeout: 5000 });
      const html = await p.content();
      await p.close();
      times.push(performance.now() - s);
      ok = html.includes('SPA Content Loaded');
    }
    results.push({ test: 'SPA render', engine: 'Playwright', times, median: med(times), success: ok });
  }

  // ═══ PART 2: Bulk scraping ═══
  console.log('\n── Part 2: Bulk Scraping ──\n');

  const pages = [
    '/basic.html', '/snapshot.html', '/forms.html', '/spa.html',
    '/responsive.html', '/dialog.html', '/states.html', '/empty.html',
  ];

  // Sequential scrape
  console.log('5. Sequential scrape (8 pages)');
  {
    const s = performance.now();
    let ok = true;
    for (const path of pages) {
      const p = await lpBrowser.newPage();
      await p.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      const html = await p.content();
      await p.close();
      if (html.length < 10) ok = false;
    }
    const total = performance.now() - s;
    results.push({ test: 'Sequential 8pg', engine: 'LP CDP', times: [total], median: total, success: ok,
      note: `${(total / pages.length).toFixed(0)}ms/page` });
  }
  {
    const s = performance.now();
    let ok = true;
    for (const path of pages) {
      const p = await pwCtx.newPage();
      await p.goto(`${BASE}${path}`);
      const html = await p.content();
      await p.close();
      if (html.length < 10) ok = false;
    }
    const total = performance.now() - s;
    results.push({ test: 'Sequential 8pg', engine: 'Playwright', times: [total], median: total, success: ok,
      note: `${(total / pages.length).toFixed(0)}ms/page` });
  }

  // Concurrent scrape — LP is single-page only, so sequential for LP, parallel for PW
  console.log('6. Concurrent scrape (8 pages — LP sequential, PW parallel)');
  {
    // LP: must be sequential (single-page CDP limitation)
    const s = performance.now();
    let ok = true;
    for (const path of pages) {
      const p = await lpBrowser.newPage();
      await p.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      const html = await p.content();
      await p.close();
      if (html.length < 10) ok = false;
    }
    const total = performance.now() - s;
    results.push({ test: 'Concurrent 8pg', engine: 'LP CDP', times: [total], median: total,
      success: ok, note: `${(total / pages.length).toFixed(0)}ms/page (sequential — no multi-tab)` });
  }
  {
    const s = performance.now();
    const results8 = await Promise.all(pages.map(async (path) => {
      const p = await pwCtx.newPage();
      await p.goto(`${BASE}${path}`);
      const html = await p.content();
      await p.close();
      return html.length;
    }));
    const total = performance.now() - s;
    results.push({ test: 'Concurrent 8pg', engine: 'Playwright', times: [total], median: total,
      success: results8.every(l => l > 10), note: `${(total / pages.length).toFixed(0)}ms/page (parallel tabs)` });
  }

  // Bulk scrape — 50 pages, sequential for both (apples to apples)
  console.log('7. Bulk sequential scrape (50 pages)');
  const bulkPages = Array(50).fill(null).map((_, i) => pages[i % pages.length]);
  {
    const s = performance.now();
    let done = 0;
    for (const path of bulkPages) {
      const p = await lpBrowser.newPage();
      await p.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await p.content();
      await p.close();
      done++;
    }
    const total = performance.now() - s;
    results.push({ test: 'Bulk 50pg seq', engine: 'LP CDP', times: [total], median: total,
      success: done === 50, note: `${(total / 50).toFixed(0)}ms/page, ${(50000 / total).toFixed(1)} pages/sec` });
  }
  {
    const s = performance.now();
    let done = 0;
    for (const path of bulkPages) {
      const p = await pwCtx.newPage();
      await p.goto(`${BASE}${path}`);
      await p.content();
      await p.close();
      done++;
    }
    const total = performance.now() - s;
    results.push({ test: 'Bulk 50pg seq', engine: 'Playwright', times: [total], median: total,
      success: done === 50, note: `${(total / 50).toFixed(0)}ms/page, ${(50000 / total).toFixed(1)} pages/sec` });
  }

  // Bulk scrape — PW concurrent (its advantage)
  console.log('8. Bulk concurrent scrape (50 pages, PW 8-worker vs LP sequential)');
  {
    // LP already measured above — reuse sequential result
    const lpSeq = results.find(r => r.test === 'Bulk 50pg seq' && r.engine === 'LP CDP')!;
    results.push({ test: 'Bulk 50pg best', engine: 'LP CDP', times: lpSeq.times, median: lpSeq.median,
      success: lpSeq.success, note: `sequential only — ${(lpSeq.median / 50).toFixed(0)}ms/page` });
  }
  {
    const s = performance.now();
    let done = 0;
    const queue = [...bulkPages];
    const workers = Array(8).fill(null).map(async () => {
      while (queue.length > 0) {
        const path = queue.shift()!;
        const p = await pwCtx.newPage();
        await p.goto(`${BASE}${path}`);
        await p.content();
        await p.close();
        done++;
      }
    });
    await Promise.all(workers);
    const total = performance.now() - s;
    results.push({ test: 'Bulk 50pg best', engine: 'Playwright', times: [total], median: total,
      success: done === 50, note: `8 workers — ${(total / 50).toFixed(0)}ms/page, ${(50000 / total).toFixed(1)} pages/sec` });
  }

  // ═══ PART 3: Memory ═══
  console.log('\n── Part 3: Memory usage ──\n');
  // Check LP and PW process memory
  try {
    const lpMem = await (async () => {
      // Find lightpanda process
      const { execSync } = await import('child_process');
      const ps = execSync('ps aux | grep lightpanda | grep -v grep', { encoding: 'utf-8' });
      const rss = ps.split(/\s+/)[5]; // RSS in KB
      return parseInt(rss) || 0;
    })();
    console.log(`Lightpanda RSS: ${(lpMem / 1024).toFixed(1)} MB`);
  } catch { console.log('Could not measure LP memory'); }

  try {
    const { execSync } = await import('child_process');
    // Chromium main process
    const ps = execSync('ps aux | grep "[c]hromium\\|[c]hrome" | head -5', { encoding: 'utf-8' });
    const lines = ps.trim().split('\n');
    let totalKB = 0;
    for (const line of lines) {
      const rss = parseInt(line.split(/\s+/)[5] || '0');
      totalKB += rss;
    }
    console.log(`Chromium total RSS: ${(totalKB / 1024).toFixed(1)} MB (${lines.length} processes)`);
  } catch { console.log('Could not measure PW memory'); }

  // ═══ RESULTS ═══
  await lpBrowser.disconnect();
  await pwBrowser.close();

  console.log('\n\n════════════════════════════════════════════════════════════════');
  console.log('              PERSISTENT MODE BENCHMARK RESULTS');
  console.log('════════════════════════════════════════════════════════════════\n');

  console.log('── Individual Operations (median of 10) ──\n');
  console.log('Test'.padEnd(22), 'LP CDP'.padStart(10), 'Playwright'.padStart(12), 'Winner'.padStart(8), 'Factor'.padStart(8));
  console.log('─'.repeat(62));

  const individualTests = results.filter(r => !r.test.includes('pg'));
  const testNames = [...new Set(individualTests.map(r => r.test))];
  for (const t of testNames) {
    const lp = individualTests.find(r => r.test === t && r.engine === 'LP CDP');
    const pw = individualTests.find(r => r.test === t && r.engine === 'Playwright');
    if (!lp || !pw) continue;
    const lpS = lp.success ? `${lp.median.toFixed(0)}ms` : 'FAIL';
    const pwS = pw.success ? `${pw.median.toFixed(0)}ms` : 'FAIL';
    let winner = '', factor = '';
    if (lp.success && pw.success) {
      const r = pw.median / lp.median;
      winner = r > 1 ? 'LP' : 'PW';
      factor = (r > 1 ? r : 1 / r).toFixed(1) + 'x';
    }
    console.log(t.padEnd(22), lpS.padStart(10), pwS.padStart(12), winner.padStart(8), factor.padStart(8));
  }

  console.log('\n── Bulk Scraping ──\n');
  console.log('Test'.padEnd(22), 'LP CDP'.padStart(12), 'Playwright'.padStart(12), 'Winner'.padStart(8), 'Factor'.padStart(8));
  console.log('─'.repeat(64));

  const bulkTests = results.filter(r => r.test.includes('pg'));
  const bulkNames = [...new Set(bulkTests.map(r => r.test))];
  for (const t of bulkNames) {
    const lp = bulkTests.find(r => r.test === t && r.engine === 'LP CDP');
    const pw = bulkTests.find(r => r.test === t && r.engine === 'Playwright');
    if (!lp || !pw) continue;
    const lpS = lp.success ? `${lp.median.toFixed(0)}ms` : 'FAIL';
    const pwS = pw.success ? `${pw.median.toFixed(0)}ms` : 'FAIL';
    let winner = '', factor = '';
    if (lp.success && pw.success) {
      const r = pw.median / lp.median;
      winner = r > 1 ? 'LP' : 'PW';
      factor = (r > 1 ? r : 1 / r).toFixed(1) + 'x';
    }
    const lpNote = lp.note ? `  (${lp.note})` : '';
    const pwNote = pw.note ? `  (${pw.note})` : '';
    console.log(t.padEnd(22), lpS.padStart(12), pwS.padStart(12), winner.padStart(8), factor.padStart(8));
    if (lpNote) console.log('  LP:', lp.note);
    if (pwNote) console.log('  PW:', pw.note);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

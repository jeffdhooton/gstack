#!/usr/bin/env bun
/**
 * Lightpanda vs Playwright benchmark
 *
 * Compares performance on DOM-only operations where Lightpanda could
 * replace Playwright (no screenshots needed).
 *
 * IMPORTANT: Start the test server separately before running:
 *   bun browse/test/test-server.ts
 * (defaults to port 9450)
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';

const LIGHTPANDA = '/tmp/lightpanda';
const ITERATIONS = 5;
const BASE_URL = process.env.TEST_URL || 'http://127.0.0.1:9450';

interface BenchResult {
  test: string;
  engine: string;
  times: number[];
  median: number;
  output_bytes: number;
  success: boolean;
  note?: string;
}

function med(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function timePW(fn: () => Promise<string>, n: number): Promise<{ times: number[]; output: string }> {
  const times: number[] = [];
  let output = '';
  for (let i = 0; i < n; i++) {
    const start = performance.now();
    output = await fn();
    times.push(performance.now() - start);
  }
  return { times, output };
}

function timeLP(args: string[], n: number): { times: number[]; output: string } {
  const times: number[] = [];
  let output = '';
  for (let i = 0; i < n; i++) {
    const start = performance.now();
    try {
      output = execSync(`${LIGHTPANDA} ${args.join(' ')}`, {
        timeout: 15000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (e: any) {
      output = e.stdout || '';
    }
    times.push(performance.now() - start);
  }
  return { times, output };
}

function add(r: BenchResult[], test: string, engine: string,
  d: { times: number[]; output: string }, check: (s: string) => boolean, note?: string) {
  r.push({ test, engine, times: d.times, median: med(d.times), output_bytes: Buffer.byteLength(d.output), success: check(d.output), note });
}

async function main() {
  console.log('=== Lightpanda vs Playwright Benchmark ===\n');

  // Verify test server is running
  try {
    const resp = await fetch(`${BASE_URL}/basic.html`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    console.log(`Test server: ${BASE_URL} ✓`);
  } catch {
    console.error(`ERROR: Test server not running at ${BASE_URL}`);
    console.error('Start it first: bun browse/test/test-server.ts');
    process.exit(1);
  }

  const results: BenchResult[] = [];
  const N = ITERATIONS;

  // ── Playwright setup ──
  console.log('\nLaunching Playwright...');
  const t0 = performance.now();
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const launchMs = performance.now() - t0;
  console.log(`  Launch: ${launchMs.toFixed(0)}ms\n`);

  // Warm up Playwright (first page load is always slower)
  const warmup = await ctx.newPage();
  await warmup.goto(`${BASE_URL}/basic.html`);
  await warmup.close();

  // ═══ TESTS ═══

  // 1. HTML extraction
  console.log('1. HTML extraction (basic.html)');
  add(results, 'HTML extraction', 'Lightpanda',
    timeLP(['fetch', '--dump', 'html', '--wait-ms', '100', `${BASE_URL}/basic.html`], N),
    s => s.includes('Hello World'));
  add(results, 'HTML extraction', 'Playwright',
    await timePW(async () => {
      const p = await ctx.newPage(); await p.goto(`${BASE_URL}/basic.html`);
      const h = await p.content(); await p.close(); return h;
    }, N), s => s.includes('Hello World'));

  // 2. Markdown / text dump
  console.log('2. Markdown / text (basic.html)');
  add(results, 'Markdown / text', 'Lightpanda',
    timeLP(['fetch', '--dump', 'markdown', '--wait-ms', '100', `${BASE_URL}/basic.html`], N),
    s => s.includes('Hello World'));
  add(results, 'Markdown / text', 'Playwright',
    await timePW(async () => {
      const p = await ctx.newPage(); await p.goto(`${BASE_URL}/basic.html`);
      const t = await p.innerText('body'); await p.close(); return t;
    }, N), s => s.includes('Hello World'));

  // 3. Semantic tree / ARIA snapshot
  console.log('3. Semantic tree (snapshot.html)');
  add(results, 'Semantic tree', 'Lightpanda',
    timeLP(['fetch', '--dump', 'semantic_tree', '--wait-ms', '100', `${BASE_URL}/snapshot.html`], N),
    s => s.includes('heading') || s.includes('button'));
  add(results, 'Semantic tree', 'Playwright',
    await timePW(async () => {
      const p = await ctx.newPage(); await p.goto(`${BASE_URL}/snapshot.html`);
      const s = await p.locator('body').ariaSnapshot(); await p.close(); return s;
    }, N), s => s.includes('heading') || s.includes('button'));

  // 4. SPA with JS execution
  console.log('4. SPA with JS (spa.html)');
  add(results, 'SPA (JS render)', 'Lightpanda',
    timeLP(['fetch', '--dump', 'html', '--wait-ms', '1500', `${BASE_URL}/spa.html`], N),
    s => s.includes('SPA Content Loaded'),
    'wait-ms=1500 for JS setTimeout(500)');
  add(results, 'SPA (JS render)', 'Playwright',
    await timePW(async () => {
      const p = await ctx.newPage(); await p.goto(`${BASE_URL}/spa.html`);
      await p.waitForSelector('.loaded', { timeout: 5000 });
      const h = await p.content(); await p.close(); return h;
    }, N), s => s.includes('SPA Content Loaded'));

  // 5. Stripped HTML (no JS/CSS)
  console.log('5. Stripped HTML (snapshot.html)');
  add(results, 'Stripped HTML', 'Lightpanda',
    timeLP(['fetch', '--dump', 'html', '--strip-mode', 'full', '--wait-ms', '100', `${BASE_URL}/snapshot.html`], N),
    s => s.includes('Snapshot Test') && !s.includes('<script'));
  add(results, 'Stripped HTML', 'Playwright',
    await timePW(async () => {
      const p = await ctx.newPage(); await p.goto(`${BASE_URL}/snapshot.html`);
      const h = await p.evaluate(() => {
        document.querySelectorAll('script, style, link[rel=stylesheet]').forEach(el => el.remove());
        return document.documentElement.outerHTML;
      });
      await p.close(); return h;
    }, N), s => s.includes('Snapshot Test'));

  // 6. Form detection
  console.log('6. Form detection (snapshot.html)');
  add(results, 'Form detection', 'Lightpanda',
    timeLP(['fetch', '--dump', 'semantic_tree', '--wait-ms', '100', `${BASE_URL}/snapshot.html`], N),
    s => s.includes('textbox') || s.includes('isInteractive'));
  add(results, 'Form detection', 'Playwright',
    await timePW(async () => {
      const p = await ctx.newPage(); await p.goto(`${BASE_URL}/snapshot.html`);
      const r = await p.evaluate(() =>
        JSON.stringify(Array.from(document.querySelectorAll('input,select,button,textarea'))
          .map(el => ({ tag: el.tagName, type: (el as HTMLInputElement).type, id: el.id })))
      );
      await p.close(); return r;
    }, N), s => s.includes('username'));

  // 7. Real website
  console.log('7. Real website (example.com)');
  add(results, 'Real site', 'Lightpanda',
    timeLP(['fetch', '--dump', 'markdown', '--wait-until', 'domcontentloaded', 'https://example.com'], N),
    s => s.includes('Example Domain'));
  add(results, 'Real site', 'Playwright',
    await timePW(async () => {
      const p = await ctx.newPage(); await p.goto('https://example.com');
      const t = await p.innerText('body'); await p.close(); return t;
    }, N), s => s.includes('Example Domain'));

  // 8. Complex page — forms.html
  console.log('8. Complex form page (forms.html)');
  add(results, 'Complex form', 'Lightpanda',
    timeLP(['fetch', '--dump', 'html', '--wait-ms', '100', `${BASE_URL}/forms.html`], N),
    s => s.includes('form') || s.includes('input'));
  add(results, 'Complex form', 'Playwright',
    await timePW(async () => {
      const p = await ctx.newPage(); await p.goto(`${BASE_URL}/forms.html`);
      const h = await p.content(); await p.close(); return h;
    }, N), s => s.includes('form') || s.includes('input'));

  // ── Cleanup ──
  await browser.close();

  // ═══ RESULTS ═══
  console.log('\n\n════════════════════════════════════════════════════════════════');
  console.log('                    BENCHMARK RESULTS');
  console.log('════════════════════════════════════════════════════════════════\n');
  console.log(`Playwright launch: ${launchMs.toFixed(0)}ms (one-time, amortized in server mode)\n`);

  const tests = [...new Set(results.map(r => r.test))];
  for (const test of tests) {
    const group = results.filter(r => r.test === test);
    console.log(`┌─ ${test}`);
    for (const r of group) {
      const flag = r.success ? '✓' : '✗';
      const ts = r.times.map(t => t.toFixed(0)).join(', ');
      console.log(`│  ${flag} ${r.engine.padEnd(16)} median ${r.median.toFixed(0).padStart(5)}ms  [${ts}]  (${r.output_bytes}B)`);
      if (r.note) console.log(`│    ${r.note}`);
    }
    if (group.length === 2 && group[0].success && group[1].success) {
      const [a, b] = group;
      const faster = a.median < b.median ? a : b;
      const slower = a.median < b.median ? b : a;
      const x = slower.median / faster.median;
      console.log(`│  → ${faster.engine} ${x.toFixed(1)}x faster`);
    }
    console.log('└─');
  }

  // Summary table
  console.log('\n── Summary ──\n');
  console.log('Test'.padEnd(22), 'LP (ms)'.padStart(10), 'PW (ms)'.padStart(10), 'Winner'.padStart(8), 'Factor'.padStart(8));
  console.log('─'.repeat(60));
  for (const test of tests) {
    const lp = results.find(r => r.test === test && r.engine === 'Lightpanda');
    const pw = results.find(r => r.test === test && r.engine === 'Playwright');
    if (!lp || !pw) continue;
    const lpS = lp.success ? lp.median.toFixed(0) : 'FAIL';
    const pwS = pw.success ? pw.median.toFixed(0) : 'FAIL';
    let winner = '', factor = '';
    if (lp.success && pw.success) {
      const ratio = pw.median / lp.median;
      winner = ratio > 1 ? 'LP' : 'PW';
      factor = (ratio > 1 ? ratio : 1 / ratio).toFixed(1) + 'x';
    }
    console.log(test.padEnd(22), lpS.padStart(10), pwS.padStart(10), winner.padStart(8), factor.padStart(8));
  }

  // Key insight
  const lpWins = results.filter(r => r.engine === 'Lightpanda' && r.success);
  const pwWins = results.filter(r => r.engine === 'Playwright' && r.success);
  console.log(`\nLightpanda succeeded: ${lpWins.length}/${tests.length} tests`);
  console.log(`Playwright succeeded: ${pwWins.length}/${tests.length} tests`);
  console.log(`\nNote: LP times include ~200ms process spawn overhead per call.`);
  console.log(`In CDP server mode or CLI daemon, this overhead is eliminated.`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

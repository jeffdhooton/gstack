/**
 * LightpandaManager — lifecycle manager for Lightpanda CDP server
 *
 * Lightpanda is 15-23x faster than Playwright for DOM-only operations.
 * This manager runs it as a persistent CDP server child process and
 * connects via puppeteer-core. Falls back gracefully when LP is
 * unavailable.
 *
 * Architecture:
 *   - LP binary spawned as child process (`lightpanda serve --port <port>`)
 *   - puppeteer-core connects via CDP WebSocket
 *   - Single page (LP doesn't support multi-tab)
 *   - Lazy URL sync: navigates LP page on first read after PW navigation
 *   - Stale tracking: after any PW write command, LP DOM is out of sync
 */

import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import { spawn, type ChildProcess, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const LP_VERSION = '0.2.8';
const LP_RELEASE_BASE = `https://github.com/lightpanda-io/browser/releases/download/${LP_VERSION}`;

/** Map platform to LP release asset name */
function getLPAssetName(): string | null {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'win32') return null; // No Windows builds

  const os = platform === 'darwin' ? 'macos' : 'linux';
  const cpu = arch === 'arm64' ? 'aarch64' : 'x86_64';
  return `lightpanda-${cpu}-${os}`;
}

/** Find the LP binary. Returns path or null if not available. */
export function findLightpandaBinary(): string | null {
  // 1. Explicit env override
  const envBin = process.env.LIGHTPANDA_BIN;
  if (envBin && fs.existsSync(envBin)) return envBin;

  // 2. gstack-managed install
  const gstackBin = path.join(process.env.HOME || '/tmp', '.gstack', 'bin', 'lightpanda');
  if (fs.existsSync(gstackBin)) return gstackBin;

  // 3. System PATH
  try {
    const which = execSync('which lightpanda', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (which && fs.existsSync(which)) return which;
  } catch { /* not in PATH */ }

  return null;
}

export class LightpandaManager {
  private process: ChildProcess | null = null;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private _available = false;
  private _stale = false;
  private _currentUrl = 'about:blank';
  private _port: number;
  private _binary: string | null;
  private _restarting = false;

  constructor(port?: number) {
    this._port = port || (30000 + Math.floor(Math.random() * 20000));
    this._binary = findLightpandaBinary();
  }

  /** Start the LP CDP server and connect puppeteer-core */
  async start(): Promise<void> {
    if (!this._binary) {
      console.log('[browse] Lightpanda: binary not found, LP fast path disabled');
      return;
    }

    try {
      // Spawn LP CDP server
      this.process = spawn(this._binary, ['serve', '--port', String(this._port), '--timeout', '86400'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });

      // Handle unexpected exit
      this.process.on('exit', (code) => {
        if (this._available && !this._restarting) {
          console.warn(`[browse] Lightpanda: process exited (code ${code}), disabling fast path`);
          this._available = false;
          this.page = null;
          this.browser = null;
          // Attempt restart after delay
          setTimeout(() => this.restart(), 5000);
        }
      });

      // Suppress stderr noise
      this.process.stderr?.on('data', () => {});

      // Wait for CDP server to be ready
      const ready = await this.waitForReady(3000);
      if (!ready) {
        console.warn('[browse] Lightpanda: CDP server failed to start, disabling fast path');
        this.kill();
        return;
      }

      // Connect puppeteer-core
      this.browser = await puppeteer.connect({
        browserWSEndpoint: `ws://127.0.0.1:${this._port}/`,
      });

      // Create the single page
      this.page = await this.browser.newPage();
      this._available = true;
      console.log(`[browse] Lightpanda: started on port ${this._port} (fast path enabled)`);
    } catch (err: any) {
      console.warn(`[browse] Lightpanda: failed to start: ${err.message}`);
      this.kill();
    }
  }

  /** Stop LP and clean up */
  async stop(): Promise<void> {
    this._available = false;
    this._restarting = true; // Suppress restart on intentional stop
    try {
      if (this.page) await this.page.close().catch(() => {});
      if (this.browser) await this.browser.disconnect().catch(() => {});
    } catch { /* ignore cleanup errors */ }
    this.page = null;
    this.browser = null;
    this.kill();
  }

  /** Navigate LP to a URL */
  async navigateTo(url: string): Promise<void> {
    if (!this._available || !this.page) return;
    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      this._currentUrl = url;
      this._stale = false;
    } catch (err: any) {
      // Navigation failed — mark unavailable for this URL but don't kill LP
      console.warn(`[browse] Lightpanda: navigation failed for ${url}: ${err.message}`);
      this._stale = true;
    }
  }

  /** Get the puppeteer Page (or null if unavailable) */
  getPage(): Page | null {
    return this._available ? this.page : null;
  }

  /** Mark LP as stale (DOM out of sync after PW write command) */
  markStale(): void {
    this._stale = true;
  }

  /** Clear stale flag (called after successful LP navigation) */
  clearStale(): void {
    this._stale = false;
  }

  /** Is LP available and not stale? */
  isAvailable(): boolean {
    return this._available;
  }

  /** Is LP stale (DOM out of sync with PW)? */
  isStale(): boolean {
    return this._stale;
  }

  /** Is LP ready for a command at the given URL? */
  isReady(url: string): boolean {
    return this._available && !this._stale && this._currentUrl === url;
  }

  /** Current URL LP is pointing at */
  getCurrentUrl(): string {
    return this._currentUrl;
  }

  /** Port LP is running on */
  get port(): number {
    return this._port;
  }

  /** Status for the browse `status` command */
  getStatus(): { available: boolean; stale: boolean; url: string; port: number; binary: string | null } {
    return {
      available: this._available,
      stale: this._stale,
      url: this._currentUrl,
      port: this._port,
      binary: this._binary,
    };
  }

  // ── Internal ──

  private async waitForReady(timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const resp = await fetch(`http://127.0.0.1:${this._port}/json/version`, {
          signal: AbortSignal.timeout(500),
        });
        if (resp.ok) return true;
      } catch { /* not ready yet */ }
      await new Promise(r => setTimeout(r, 200));
    }
    return false;
  }

  private kill(): void {
    if (this.process) {
      try { this.process.kill('SIGTERM'); } catch { /* already dead */ }
      this.process = null;
    }
  }

  private async restart(): Promise<void> {
    if (this._restarting) return;
    this._restarting = true;
    console.log('[browse] Lightpanda: attempting restart...');
    this.kill();
    await new Promise(r => setTimeout(r, 1000));
    this._restarting = false;
    await this.start();
  }
}

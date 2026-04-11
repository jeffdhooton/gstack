/**
 * LP read commands — fast path via Lightpanda CDP (puppeteer-core)
 *
 * Mirrors the page.evaluate() calls from read-commands.ts but uses
 * puppeteer's Page type. The JS passed to evaluate() is identical —
 * only the page object type differs.
 *
 * Commands routed here: text, html, links, forms, js, eval, css, attrs, storage, perf
 * NOT routed: accessibility, is, inspect, console, network, dialog, cookies
 */

import type { Page } from 'puppeteer-core';
import type { LightpandaManager } from './lightpanda';
import * as fs from 'fs';
import { validateReadPath } from './read-commands';

/** Detect await keyword, ignoring comments. */
function hasAwait(code: string): boolean {
  const stripped = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  return /\bawait\b/.test(stripped);
}

/** Detect whether code needs a block wrapper. */
function needsBlockWrapper(code: string): boolean {
  const trimmed = code.trim();
  if (trimmed.split('\n').length > 1) return true;
  if (/\b(const|let|var|function|class|return|throw|if|for|while|switch|try)\b/.test(trimmed)) return true;
  if (trimmed.includes(';')) return true;
  return false;
}

/** Wrap code for page.evaluate(). */
function wrapForEvaluate(code: string): string {
  if (!hasAwait(code)) return code;
  const trimmed = code.trim();
  return needsBlockWrapper(trimmed)
    ? `(async()=>{\n${code}\n})()`
    : `(async()=>(${trimmed}))()`;
}

export async function handleReadCommandLP(
  command: string,
  args: string[],
  lm: LightpandaManager,
): Promise<string> {
  const page = lm.getPage();
  if (!page) throw new Error('Lightpanda page not available');

  switch (command) {
    case 'text': {
      return await page.evaluate(() => {
        const body = document.body;
        if (!body) return '';
        const clone = body.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('script, style, noscript, svg').forEach(el => el.remove());
        return clone.innerText
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
          .join('\n');
      });
    }

    case 'html': {
      const selector = args[0];
      if (selector) {
        // CSS selector only — @ref args are filtered out before reaching LP
        const html = await page.evaluate((sel: string) => {
          const el = document.querySelector(sel);
          if (!el) throw new Error(`Element not found: ${sel}`);
          return el.innerHTML;
        }, selector);
        return html;
      }
      const doctype = await page.evaluate(() => {
        const dt = document.doctype;
        return dt ? `<!DOCTYPE ${dt.name}>` : '';
      });
      const html = await page.evaluate(() => document.documentElement.outerHTML);
      return doctype ? `${doctype}\n${html}` : html;
    }

    case 'links': {
      const links = await page.evaluate(() =>
        [...document.querySelectorAll('a[href]')].map(a => ({
          text: a.textContent?.trim().slice(0, 120) || '',
          href: (a as HTMLAnchorElement).href,
        })).filter(l => l.text && l.href)
      );
      return links.map((l: { text: string; href: string }) => `${l.text} → ${l.href}`).join('\n');
    }

    case 'forms': {
      const forms = await page.evaluate(() => {
        return [...document.querySelectorAll('form')].map((form, i) => {
          const fields = [...form.querySelectorAll('input, select, textarea')].map(el => {
            const input = el as HTMLInputElement;
            return {
              tag: el.tagName.toLowerCase(),
              type: input.type || undefined,
              name: input.name || undefined,
              id: input.id || undefined,
              placeholder: input.placeholder || undefined,
              required: input.required || undefined,
              value: input.type === 'password' ? '[redacted]' : (input.value || undefined),
              options: el.tagName === 'SELECT'
                ? [...(el as HTMLSelectElement).options].map(o => ({ value: o.value, text: o.text }))
                : undefined,
            };
          });
          return {
            index: i,
            action: form.action || undefined,
            method: form.method || 'get',
            id: form.id || undefined,
            fields,
          };
        });
      });
      return JSON.stringify(forms, null, 2);
    }

    case 'js': {
      const expr = args[0];
      if (!expr) throw new Error('Usage: browse js <expression>');
      const wrapped = wrapForEvaluate(expr);
      const result = await page.evaluate(wrapped);
      return typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result ?? '');
    }

    case 'eval': {
      const filePath = args[0];
      if (!filePath) throw new Error('Usage: browse eval <js-file>');
      validateReadPath(filePath);
      if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
      const code = fs.readFileSync(filePath, 'utf-8');
      const wrapped = wrapForEvaluate(code);
      const result = await page.evaluate(wrapped);
      return typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result ?? '');
    }

    case 'css': {
      const [selector, property] = args;
      if (!selector || !property) throw new Error('Usage: browse css <selector> <property>');
      // CSS selector only — @ref filtered upstream
      const value = await page.evaluate(
        (sel: string, prop: string) => {
          const el = document.querySelector(sel);
          if (!el) return `Element not found: ${sel}`;
          return getComputedStyle(el).getPropertyValue(prop);
        },
        selector, property,
      );
      return value;
    }

    case 'attrs': {
      const selector = args[0];
      if (!selector) throw new Error('Usage: browse attrs <selector>');
      // CSS selector only — @ref filtered upstream
      const attrs = await page.evaluate((sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return `Element not found: ${sel}`;
        const result: Record<string, string> = {};
        for (const attr of el.attributes) {
          result[attr.name] = attr.value;
        }
        return result;
      }, selector);
      return typeof attrs === 'string' ? attrs : JSON.stringify(attrs, null, 2);
    }

    case 'storage': {
      if (args[0] === 'set' && args[1]) {
        const key = args[1];
        const value = args[2] || '';
        await page.evaluate((k: string, v: string) => localStorage.setItem(k, v), key, value);
        return `Set localStorage["${key}"]`;
      }
      const storage = await page.evaluate(() => ({
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage },
      }));
      // Redact sensitive values
      const SENSITIVE_KEY = /(^|[_.-])(token|secret|key|password|credential|auth|jwt|session|csrf)($|[_.-])|api.?key/i;
      const SENSITIVE_VALUE = /^(eyJ|sk-|sk_live_|sk_test_|pk_live_|pk_test_|rk_live_|sk-ant-|ghp_|gho_|github_pat_|xox[bpsa]-|AKIA[A-Z0-9]{16}|AIza|SG\.|Bearer\s|sbp_)/;
      const redacted = JSON.parse(JSON.stringify(storage));
      for (const storeType of ['localStorage', 'sessionStorage'] as const) {
        const store = redacted[storeType];
        if (!store) continue;
        for (const [key, value] of Object.entries(store)) {
          if (typeof value !== 'string') continue;
          if (SENSITIVE_KEY.test(key) || SENSITIVE_VALUE.test(value)) {
            store[key] = `[REDACTED — ${value.length} chars]`;
          }
        }
      }
      return JSON.stringify(redacted, null, 2);
    }

    case 'perf': {
      const timings = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (!nav) return 'No navigation timing data available.';
        return {
          dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
          tcp: Math.round(nav.connectEnd - nav.connectStart),
          ssl: Math.round(nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0),
          ttfb: Math.round(nav.responseStart - nav.requestStart),
          download: Math.round(nav.responseEnd - nav.responseStart),
          domParse: Math.round(nav.domInteractive - nav.responseEnd),
          domReady: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
          load: Math.round(nav.loadEventEnd - nav.startTime),
          total: Math.round(nav.loadEventEnd - nav.startTime),
        };
      });
      if (typeof timings === 'string') return timings;
      return Object.entries(timings)
        .map(([k, v]) => `${k.padEnd(12)} ${v}ms`)
        .join('\n');
    }

    default:
      throw new Error(`LP: unsupported command: ${command}`);
  }
}

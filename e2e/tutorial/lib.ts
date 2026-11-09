import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Browser, BrowserContext, Locator, Page } from '@playwright/test';

/**
 * Helpers for the narrated tutorial videos (e2e/tutorial.spec.ts).
 * Each `say()` turns a Bengali sentence into speech (edge-tts, voice bn-BD-NabanitaNeural), shows it as a
 * caption, and waits until it has been spoken while an optional action runs on screen at the same time.
 * `finish()` closes the recording and mixes every spoken clip into the video at the moment it started.
 */
const ROOT = resolve('tutorial-videos');
const CACHE = resolve(ROOT, 'audio-cache');
const TTS = process.env.TTS_BIN ?? resolve(ROOT, '.venv/bin/edge-tts');
const VOICE = process.env.TTS_VOICE ?? 'bn-BD-NabanitaNeural';

function speech(text: string): { file: string; seconds: number } {
  mkdirSync(CACHE, { recursive: true });
  const file = resolve(CACHE, `${createHash('sha1').update(`${VOICE}|${text}`).digest('hex').slice(0, 16)}.mp3`);
  const partial = `${file}.part`;
  for (let attempt = 1; !(existsSync(file) && statSync(file).size > 0); attempt++) {
    try {
      execFileSync(TTS, ['-v', VOICE, '--rate=-8%', '-t', text, '--write-media', partial], { stdio: 'pipe', timeout: 60_000 });
      if (statSync(partial).size > 0) renameSync(partial, file);
    } catch (error) {
      rmSync(partial, { force: true });
      if (attempt >= 4) throw error;
    }
  }
  const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());
  return { file, seconds };
}

export class Narrator {
  private clips: { at: number; file: string }[] = [];
  private started = Date.now();
  private constructor(readonly context: BrowserContext, readonly page: Page, private readonly outName: string) {}

  static async start(browser: Browser, outName: string): Promise<Narrator> {
    const dir = resolve(ROOT, '.raw', outName);
    const context = await browser.newContext({ recordVideo: { dir, size: { width: 1280, height: 800 } }, viewport: { width: 1280, height: 800 } });
    // The caption survives page loads: it is kept in sessionStorage and drawn again on every new document.
    await context.addInitScript(() => {
      const draw = () => {
        let text: string | null = null;
        try { text = sessionStorage.getItem('__cap'); } catch { /* ignore */ }
        let el = document.getElementById('tutorial-caption');
        if (!text) { el?.remove(); return; }
        if (!el) {
          el = document.createElement('div');
          el.id = 'tutorial-caption';
          el.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483647;background:rgba(15,23,42,.92);color:#fff;padding:12px 24px;border-radius:14px;font:600 19px/1.5 system-ui,"Noto Sans Bengali",sans-serif;width:max-content;max-width:86%;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.35);pointer-events:none';
          (document.body ?? document.documentElement).appendChild(el);
        }
        el.textContent = text;
      };
      window.addEventListener('DOMContentLoaded', draw);
      (window as unknown as { __drawCaption: () => void }).__drawCaption = draw;
    });
    const page = await context.newPage();
    const narrator = new Narrator(context, page, outName);
    narrator.started = Date.now();
    return narrator;
  }

  private async setCaption(text: string | null) {
    await this.page.evaluate((value) => {
      try { if (value) sessionStorage.setItem('__cap', value); else sessionStorage.removeItem('__cap'); } catch { /* ignore */ }
      (window as unknown as { __drawCaption?: () => void }).__drawCaption?.();
    }, text).catch(() => undefined);
  }

  /** Speak `text` (and show it as a caption) while `action` runs; returns when both are done. */
  async say(text: string, action?: () => Promise<unknown>) {
    console.log(`STEP ${((Date.now() - this.started) / 1000).toFixed(0)}s: ${text.slice(0, 40)}`);
    const { file, seconds } = speech(text);
    await this.setCaption(text);
    this.clips.push({ at: (Date.now() - this.started) / 1000 + 0.15, file });
    const begin = Date.now();
    if (action) await action();
    // The caption may have been wiped by a page load inside `action`.
    await this.setCaption(text);
    const rest = seconds * 1000 + 700 - (Date.now() - begin);
    if (rest > 0) await this.page.waitForTimeout(rest);
  }

  /** Full-screen title card: part number, name and a one-line summary, spoken once. */
  async title(part: string, name: string, summary: string, spoken: string) {
    await this.page.evaluate(([p, n, s]) => {
      document.getElementById('tutorial-title')?.remove();
      const el = document.createElement('div');
      el.id = 'tutorial-title';
      el.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:linear-gradient(135deg,#7f1d1d,#0f172a);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:40px;font-family:system-ui,"Noto Sans Bengali",sans-serif';
      el.innerHTML = `<div style="font-size:22px;letter-spacing:.12em;color:#fca5a5;font-weight:700">${p}</div><div style="font-size:54px;font-weight:900;line-height:1.25">${n}</div><div style="font-size:24px;color:#e2e8f0;max-width:900px;line-height:1.6">${s}</div>`;
      document.body.appendChild(el);
    }, [part, name, summary]);
    await this.say(spoken);
    await this.page.evaluate(() => document.getElementById('tutorial-title')?.remove());
  }

  /** Red outline around an element, so the viewer sees where to look. */
  async highlight(locator: Locator, ms = 1400) {
    await locator.first().evaluate((el) => {
      const html = el as HTMLElement;
      html.dataset.prevOutline = html.style.outline;
      html.style.outline = '4px solid #ef4444';
      html.style.outlineOffset = '4px';
    }).catch(() => undefined);
    await this.page.waitForTimeout(ms);
    await locator.first().evaluate((el) => {
      const html = el as HTMLElement;
      html.style.outline = html.dataset.prevOutline ?? '';
    }).catch(() => undefined);
  }

  /** Closes the recording and writes tutorial-videos/<outName>.mp4 with the narration mixed in. */
  async finish(): Promise<string> {
    await this.setCaption(null);
    const video = this.page.video();
    await this.context.close();
    const source = await video!.path();
    const out = resolve(ROOT, `${this.outName}.mp4`);
    const args = ['-loglevel', 'error', '-y', '-i', source];
    for (const clip of this.clips) args.push('-i', clip.file);
    const filters = this.clips.map((clip, index) => `[${index + 1}:a]adelay=${Math.round(clip.at * 1000)}:all=1[a${index}]`);
    const mix = `${this.clips.map((_, index) => `[a${index}]`).join('')}amix=inputs=${this.clips.length}:normalize=0:dropout_transition=0[aout]`;
    args.push('-filter_complex', [...filters, mix].join(';'), '-map', '0:v', '-map', '[aout]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out);
    execFileSync('ffmpeg', args);
    return out;
  }
}


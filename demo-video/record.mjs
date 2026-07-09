import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync, readdirSync, renameSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, 'scenes.json'), 'utf8'));
const outDir = join(__dirname, 'output', 'scenes');
const audioDir = join(__dirname, 'output', 'audio');
const PASSWORD = config.password;
const BASE = config.baseUrl;
const API = BASE.replace('sumaya-web', 'sumaya-api') + '/health';

mkdirSync(outDir, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function audioDuration(sceneId) {
  const mp3 = join(audioDir, `${sceneId}.mp3`);
  if (!existsSync(mp3)) return 20;
  try {
    const out = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${mp3}"`, { encoding: 'utf8' }).trim();
    return parseFloat(out) || 20;
  } catch {
    return 20;
  }
}

async function wakeServices() {
  console.log('Waking Render services (cold start)...');
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(API, { signal: AbortSignal.timeout(60000) });
      if (res.ok) {
        const data = await res.json();
        console.log(`  API ready: ${JSON.stringify(data)}`);
        break;
      }
    } catch {
      console.log(`  Waiting for API... attempt ${i + 1}`);
    }
    await sleep(15000);
  }
  await fetch(BASE, { signal: AbortSignal.timeout(60000) }).catch(() => {});
  await sleep(5000);
}

async function logout(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => {});
  await page.evaluate(() => {
    try {
      localStorage.removeItem('sumaya_token');
      localStorage.removeItem('sumaya_user');
      localStorage.removeItem('sumaya_branch');
    } catch { /* */ }
  }).catch(() => {});
}

async function staffLogin(page, email, loginPath) {
  await logout(page);
  await page.goto(BASE + loginPath, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('input[type=email]', { timeout: 90000 });
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForTimeout(5000);
  const url = page.url();
  if (url.includes('/login')) {
    await page.click('button[type=submit]');
    await page.waitForTimeout(8000);
  }
}

async function padToDuration(page, startMs, targetSec) {
  const remaining = targetSec * 1000 - (Date.now() - startMs);
  if (remaining <= 500) return;
  const steps = Math.max(4, Math.ceil(remaining / 3000));
  const stepMs = remaining / steps;
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.scrollBy(0, 150));
    await page.waitForTimeout(stepMs);
  }
}

async function gotoAndWait(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(4000);
  if (page.url().includes('/login') && !url.includes('/login') && !url.includes('/book') && !url.includes('/queue')) {
    console.warn(`  Redirected to login from ${url}`);
  }
}

async function runAction(page, action) {
  switch (action.type) {
    case 'wait':
      await page.waitForTimeout(action.ms || 1000);
      break;
    case 'scroll':
      await page.evaluate((y) => window.scrollBy(0, y), action.y || 400);
      await page.waitForTimeout(1000);
      break;
    case 'fill': {
      let el;
      if (action.selector?.includes('type=')) el = page.locator(action.selector);
      else if (action.index !== undefined) el = page.locator('input').nth(action.index);
      else el = page.locator(action.selector || 'input');
      await el.first().fill(String(action.value).replace(/\{\{ts\}\}/g, String(Date.now())));
      break;
    }
    case 'click': {
      if (action.text) {
        const link = page.getByRole('link', { name: action.text });
        const btn = page.getByRole('button', { name: action.text });
        if (await link.count() > 0) await link.first().click({ timeout: 15000 });
        else if (await btn.count() > 0) await btn.first().click({ timeout: 15000 });
        else await page.getByText(action.text, { exact: false }).first().click({ timeout: 12000 });
      } else {
        const loc = page.locator(action.selector);
        await (action.first ? loc.first() : loc).click({ timeout: 15000 });
      }
      break;
    }
    case 'logout':
      await logout(page);
      break;
    default:
      break;
  }
}

async function recordScene(browser, scene) {
  const videoDir = join(outDir, scene.id);
  mkdirSync(videoDir, { recursive: true });
  const targetSec = audioDuration(scene.id) + 0.5;

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } },
    locale: 'en-IN',
  });
  const page = await context.newPage();
  const startMs = Date.now();

  console.log(`Recording: ${scene.id} — ${scene.title} (target ${targetSec.toFixed(1)}s)`);

  try {
    if (scene.login) {
      await staffLogin(page, scene.login.email, scene.login.path);
    }
    await gotoAndWait(page, BASE + scene.path);

    for (const action of scene.actions || []) {
      try {
        await runAction(page, action);
      } catch (err) {
        console.warn(`  Action warning in ${scene.id}:`, err.message);
        await page.waitForTimeout(2000);
      }
    }
    await padToDuration(page, startMs, targetSec);
  } catch (err) {
    console.error(`  Scene error ${scene.id}:`, err.message);
    await padToDuration(page, startMs, targetSec);
  }

  await context.close();
  const files = readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
  if (files.length > 0) {
    const src = join(videoDir, files[0]);
    const dest = join(outDir, `${scene.id}.webm`);
    if (existsSync(dest)) try { unlinkSync(dest); } catch { /* */ }
    renameSync(src, dest);
    console.log(`  Saved: ${dest}`);
  }
}

async function main() {
  await wakeServices();
  const only = process.argv[2];
  const scenes = only ? config.scenes.filter((s) => s.id === only || s.id.startsWith(only)) : config.scenes;
  console.log(`Recording ${scenes.length} scenes against ${BASE}`);
  const browser = await chromium.launch({ headless: true });
  for (const scene of scenes) {
    await recordScene(browser, scene);
  }
  await browser.close();
  console.log('Recording complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

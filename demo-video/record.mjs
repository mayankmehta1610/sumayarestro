import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, 'scenes.json'), 'utf8'));
const outDir = join(__dirname, 'output', 'scenes');
const audioDir = join(__dirname, 'output', 'audio');
const PASSWORD = config.password;
const BASE = config.baseUrl;
const API_BASE = BASE.replace('sumaya-web', 'sumaya-api') + '/api/v1';
const SLUG = config.slug;

mkdirSync(outDir, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function audioDuration(sceneId) {
  const mp3 = join(audioDir, `${sceneId}.mp3`);
  if (!existsSync(mp3)) return 30;
  try {
    const out = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${mp3}"`, { encoding: 'utf8' }).trim();
    return parseFloat(out) || 30;
  } catch {
    return 30;
  }
}

async function apiLogin(email, mode = 'staff') {
  if (mode === 'customer') {
    const res = await fetch(`${API_BASE}/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD, restaurant_slug: SLUG }),
    });
    if (!res.ok) throw new Error(`Customer login failed: ${await res.text()}`);
    const data = await res.json();
    return { token: data.access_token, user: { ...data.user, restaurant_slug: SLUG, role: 'customer' } };
  }
  const res = await fetch(`${API_BASE}/auth/restaurant-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, restaurant_slug: SLUG }),
  });
  if (!res.ok) throw new Error(`Staff login failed: ${await res.text()}`);
  const data = await res.json();
  let user = { ...data.user, restaurant_slug: SLUG };
  let token = data.access_token;

  if (!user.branch_id && user.branches?.length) {
    const branchId = user.branches.find((b) => b.code === 'BR-001')?.id || user.branches[0].id;
    const br = await fetch(`${API_BASE}/auth/set-branch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch_id: branchId }),
    });
    if (br.ok) {
      user = { ...user, branch_id: branchId, needs_branch_selection: false };
    }
  }
  return { token, user };
}

async function preflightData(token, scene) {
  if (!scene.preflight) return true;
  const headers = { Authorization: `Bearer ${token}` };
  const res = await fetch(`${API_BASE}${scene.preflight.path}`, { headers, signal: AbortSignal.timeout(90000) });
  if (!res.ok) return false;
  const data = await res.json();
  let items = data.items || [];
  if (scene.preflight.filter === 'unpaid') {
    items = items.filter((o) => o.payment_status !== 'paid');
  }
  return items.length >= (scene.preflight.min || 1);
}

async function setupApiProxy(context) {
  await context.route(`${API_BASE.replace('/api/v1', '')}/**`, async (route) => {
    const req = route.request();
    const url = req.url();
    try {
      const res = await fetch(url, {
        method: req.method(),
        headers: req.headers(),
        body: req.postData() || undefined,
        signal: AbortSignal.timeout(120000),
      });
      const body = await res.text();
      const headers = {};
      res.headers.forEach((v, k) => { headers[k] = v; });
      await route.fulfill({ status: res.status, headers, body });
    } catch (err) {
      console.warn(`  API proxy fail ${url}: ${err.message}`);
      await route.continue();
    }
  });
}

async function wakeServices() {
  console.log('Warming API + web...');
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch(API_BASE.replace('/api/v1', '') + '/health', { signal: AbortSignal.timeout(90000) });
      if (res.ok) {
        const d = await res.json();
        if (d.seeded) break;
      }
    } catch { /* retry */ }
    await sleep(8000);
  }
  const endpoints = ['/kot/queue', '/orders/list?page_size=10', '/tables/floor', '/inventory/list?page_size=10'];
  const login = await apiLogin('waiter@spice-garden.com');
  for (const ep of endpoints) {
    await fetch(`${API_BASE}${ep}`, {
      headers: { Authorization: `Bearer ${login.token}` },
      signal: AbortSignal.timeout(90000),
    }).catch(() => {});
  }
  await fetch(BASE, { signal: AbortSignal.timeout(90000) }).catch(() => {});
  await sleep(5000);
}

async function injectAuth(page, scene) {
  if (scene.roleKey === 'public' && !scene.login && !scene.customerLogin) return null;

  let auth = null;
  if (scene.login?.email) {
    auth = await apiLogin(scene.login.email, 'staff');
  } else if (scene.customerLogin) {
    auth = await apiLogin(scene.customerLogin, 'customer');
  }

  if (auth) {
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('sumaya_token', token);
      localStorage.setItem('sumaya_user', JSON.stringify(user));
      if (user.branch_id) localStorage.setItem('sumaya_branch', user.branch_id);
    }, auth);
  }
  return auth;
}

async function waitForImagesLoaded(page, min = 3) {
  await page.waitForFunction(
    (m) => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const loaded = imgs.filter((img) => img.complete && img.naturalWidth > 0);
      return loaded.length >= m;
    },
    min,
    { timeout: 60000 },
  ).catch(() => {});
}

async function waitForAppReady(page) {
  await page.waitForFunction(
    () => {
      const path = window.location.pathname;
      if (path.includes('/login') || path.includes('/select-branch')) return false;
      const body = document.body?.innerText || '';
      if (/^Loading\.{0,3}$/.test(body.trim())) return false;
      if (body.includes('Loading tables from database')) return false;
      if (body.includes('Loading KOT tickets')) return false;
      if (body.includes('Loading orders...')) return false;
      return document.querySelector('h1, main, .card, table, [data-testid]') !== null;
    },
    { timeout: 120000 },
  );
}

async function countData(page, scene) {
  if (!scene.dataWait) return 0;
  if (scene.dataWait.startsWith('text=')) {
    return page.getByText(scene.dataWait.replace('text=', ''), { exact: false }).count();
  }
  return page.locator(scene.dataWait).count();
}

async function waitForDataStrict(page, scene) {
  const min = scene.dataMin || 1;
  if (!scene.dataWait) return 0;

  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const count = await countData(page, scene);
    if (count >= min) return count;
    await page.waitForTimeout(1500);
  }
  const final = await countData(page, scene);
  throw new Error(`Data not loaded: ${scene.dataWait} need ${min}, got ${final} (scene ${scene.id})`);
}

async function prewarmScene(browser, scene) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'en-IN' });
  await setupApiProxy(context);
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(() => localStorage.clear());

  const auth = await injectAuth(page, scene);
  if (auth && scene.preflight) {
    for (let i = 0; i < 5; i++) {
      if (await preflightData(auth.token, scene)) break;
      console.log(`  Preflight retry ${i + 1} for ${scene.id}`);
      await sleep(6000);
    }
  }

  const url = BASE + scene.path;
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 180000 });
    await sleep(1500);
    if (page.url().includes('/login')) {
      await injectAuth(page, scene);
      continue;
    }
    await waitForAppReady(page);
    try {
      const rows = await waitForDataStrict(page, scene);
      const storageState = await context.storageState();
      await context.close();
      return { storageState, auth, rowCount: rows };
    } catch (err) {
      console.warn(`  Prewarm attempt ${attempt}: ${err.message}`);
      if (attempt === 3) {
        await context.close();
        throw err;
      }
      await sleep(5000);
    }
  }
  await context.close();
  throw new Error(`Prewarm failed for ${scene.id}`);
}

async function padToDuration(page, startMs, targetSec) {
  const remaining = targetSec * 1000 - (Date.now() - startMs);
  if (remaining <= 500) return;
  const steps = Math.max(4, Math.ceil(remaining / 3500));
  const stepMs = remaining / steps;
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.scrollBy(0, 80));
    await page.waitForTimeout(stepMs);
  }
}

async function runAction(page, action) {
  switch (action.type) {
    case 'hold':
    case 'wait':
      await page.waitForTimeout(action.ms || 1000);
      break;
    case 'scroll':
      await page.evaluate((y) => window.scrollBy(0, y), action.y || 400);
      await page.waitForTimeout(1500);
      break;
    case 'fill': {
      const el = action.index !== undefined ? page.locator('input').nth(action.index) : page.locator(action.selector || 'input');
      await el.first().fill(String(action.value), { timeout: 30000 });
      break;
    }
    case 'click': {
      if (action.text) {
        if (action.role === 'button') {
          await page.getByRole('button', { name: new RegExp(action.text, 'i') }).first().click({ timeout: 30000 });
        } else {
          const link = page.getByRole('link', { name: action.text });
          const btn = page.getByRole('button', { name: action.text });
          if (await link.count() > 0) await link.first().click({ timeout: 25000 });
          else if (await btn.count() > 0) await btn.first().click({ timeout: 25000 });
          else await page.getByText(action.text, { exact: false }).first().click({ timeout: 25000 });
        }
      } else {
        let loc = page.locator(action.selector);
        if (action.index !== undefined) loc = loc.nth(action.index);
        else if (action.first) loc = loc.first();
        await loc.click({ timeout: 30000 });
      }
      break;
    }
    case 'fillLabel': {
      const val = String(action.value);
      const field = page.locator('.label', { hasText: action.label })
        .locator('xpath=ancestor::div[1]//input | ancestor::div[1]//textarea').first();
      if (await field.count() > 0) await field.fill(val, { timeout: 30000 });
      else await page.getByLabel(action.label, { exact: false }).fill(val, { timeout: 30000 });
      break;
    }
    case 'waitFor':
      await page.waitForSelector(action.selector, { timeout: 90000, state: 'visible' });
      break;
    case 'waitForMin':
      await page.waitForFunction(
        (s, m) => document.querySelectorAll(s).length >= m,
        action.selector, action.min || 1,
        { timeout: 90000 },
      );
      break;
    default:
      break;
  }
}

async function recordScene(browser, scene) {
  const videoDir = join(outDir, scene.id);
  mkdirSync(videoDir, { recursive: true });
  const targetSec = audioDuration(scene.id) + 0.5;
  const leadIn = scene.videoLeadInMs || scene.audioLeadInMs || 0;

  console.log(`Recording: ${scene.id} — ${scene.title} (${targetSec.toFixed(1)}s audio, ${leadIn}ms lead-in)`);

  let storageState;
  let rowCount = 0;
  if (scene.dataWait || scene.login || scene.customerLogin) {
    const warmed = await prewarmScene(browser, scene);
    storageState = warmed.storageState;
    rowCount = warmed.rowCount;
    console.log(`  Prewarm OK: ${rowCount} data elements visible`);
  }

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } },
    locale: 'en-IN',
    storageState,
  });
  await setupApiProxy(context);
  const page = await context.newPage();
  const recordStartMs = Date.now();

  try {
    await page.goto(BASE + scene.path, { waitUntil: 'networkidle', timeout: 180000 });
    await waitForAppReady(page);
    if (scene.dataWait) {
      rowCount = await waitForDataStrict(page, scene);
      if (scene.dataWait.includes('menu-item') || scene.path.includes('/order')) {
        await waitForImagesLoaded(page, scene.dataMin || 3);
      }
    }

    const contentStartMs = Date.now();
    const trimMs = contentStartMs - recordStartMs;
    console.log(`  Content ready at ${(trimMs / 1000).toFixed(1)}s — holding ${leadIn}ms for audio sync`);

    if (leadIn > 0) await page.waitForTimeout(leadIn);

    for (const action of scene.actions || []) {
      try {
        await runAction(page, action);
      } catch (err) {
        console.warn(`  Action warning: ${err.message}`);
        await page.waitForTimeout(1500);
      }
    }

    await padToDuration(page, contentStartMs, targetSec);
    writeFileSync(join(outDir, `${scene.id}.meta.json`), JSON.stringify({
      rowCount,
      targetSec,
      leadIn,
      trimMs,
      contentStartMs: trimMs,
    }, null, 2));
  } catch (err) {
    console.error(`  FAILED ${scene.id}: ${err.message}`);
    await page.screenshot({ path: join(outDir, `${scene.id}-error.png`), fullPage: true }).catch(() => {});
    await context.close();
    throw err;
  }

  await context.close();
  const files = readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
  if (files.length > 0) {
    const dest = join(outDir, `${scene.id}.webm`);
    if (existsSync(dest)) try { unlinkSync(dest); } catch { /* */ }
    renameSync(join(videoDir, files[0]), dest);
    console.log(`  Saved: ${dest}`);
  }
}

async function recordMobileScene(browser, scene) {
  const MOBILE_URL = process.env.MOBILE_URL || 'http://localhost:19006';
  const videoDir = join(outDir, scene.id);
  mkdirSync(videoDir, { recursive: true });
  const targetSec = audioDuration(scene.id) + 0.5;
  const leadIn = scene.videoLeadInMs || scene.audioLeadInMs || 0;

  const roleEmails = {
    waiter: 'waiter@spice-garden.com',
    kitchen_staff: 'kitchen@spice-garden.com',
    customer: 'customer@spice-garden.com',
  };
  const email = roleEmails[scene.mobileRole] || 'waiter@spice-garden.com';
  const mode = scene.mobileRole === 'customer' ? 'customer' : 'staff';
  const auth = await apiLogin(email, mode);

  // Prewarm — load app fully before recording
  const warmCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'en-IN',
    deviceScaleFactor: 2,
  });
  await setupApiProxy(warmCtx);
  const warmPage = await warmCtx.newPage();
  await warmPage.goto(MOBILE_URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await warmPage.evaluate(({ token, user }) => {
    localStorage.clear();
    localStorage.setItem('sumaya_token', token);
    localStorage.setItem('sumaya_user', JSON.stringify(user));
    if (user.branch_id) localStorage.setItem('sumaya_branch', user.branch_id);
  }, auth);
  await warmPage.goto(MOBILE_URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await sleep(6000);

  const tabMap = { tables: 'Tables', kitchen: 'Kitchen', pos: 'POS', 'customer-order': 'Menu' };
  const tab = tabMap[scene.mobileScreen];
  if (tab) {
    await warmPage.getByText(tab, { exact: false }).first().click({ timeout: 30000 }).catch(() => {});
    await sleep(5000);
  }
  if (scene.mobileScreen === 'tables' || scene.mobileRole === 'waiter') {
    await warmPage.getByText('POS', { exact: false }).first().click({ timeout: 15000 }).catch(() => {});
    await sleep(4000);
  }
  await warmPage.waitForFunction(
    () => !document.body?.innerText?.includes('Loading'),
    { timeout: 90000 },
  );
  await warmPage.waitForFunction(
    () => document.querySelectorAll('img, [style*="background"]').length >= 2
      || document.body.innerText.length > 200,
    { timeout: 60000 },
  ).catch(() => {});
  const storageState = await warmCtx.storageState();
  await warmCtx.close();

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: videoDir, size: { width: 390, height: 844 } },
    locale: 'en-IN',
    deviceScaleFactor: 2,
    storageState,
  });
  await setupApiProxy(context);
  const page = await context.newPage();
  const recordStartMs = Date.now();

  try {
    await page.goto(MOBILE_URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await sleep(4000);
    if (tab) {
      await page.getByText(tab, { exact: false }).first().click({ timeout: 20000 }).catch(() => {});
      await sleep(3000);
    }
    await page.waitForFunction(
      () => !document.body?.innerText?.includes('Loading'),
      { timeout: 90000 },
    );

    const contentStartMs = Date.now();
    const trimMs = contentStartMs - recordStartMs;
    console.log(`  Mobile ready at ${(trimMs / 1000).toFixed(1)}s — holding ${leadIn}ms`);

    if (leadIn > 0) await page.waitForTimeout(leadIn);

    for (const action of scene.actions || []) {
      try { await runAction(page, action); } catch (err) {
        console.warn(`  Mobile action: ${err.message}`);
      }
    }
    await padToDuration(page, contentStartMs, targetSec);
    writeFileSync(join(outDir, `${scene.id}.meta.json`), JSON.stringify({ targetSec, leadIn, trimMs }, null, 2));
  } catch (err) {
    console.error(`  Mobile FAILED: ${err.message}`);
    await page.screenshot({ path: join(outDir, `${scene.id}-error.png`), fullPage: true }).catch(() => {});
    await padToDuration(page, recordStartMs, targetSec);
  }

  await context.close();
  const files = readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
  if (files.length > 0) {
    const dest = join(outDir, `${scene.id}.webm`);
    if (existsSync(dest)) try { unlinkSync(dest); } catch { /* */ }
    renameSync(join(videoDir, files[0]), dest);
    console.log(`  Saved mobile: ${dest}`);
  }
}

async function startExpoWeb() {
  const { spawn } = await import('child_process');
  const mobileDir = join(__dirname, '..', 'mobile');
  const port = 19006;
  const url = `http://localhost:${port}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return url;
  } catch { /* start */ }

  spawn(`npx expo start --web --port ${port}`, [], {
    cwd: mobileDir,
    env: { ...process.env, EXPO_PUBLIC_API_URL: 'https://sumaya-api.onrender.com/api/v1', CI: '1' },
    stdio: 'ignore', shell: true, detached: true,
  }).unref();

  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return url;
    } catch { /* wait */ }
  }
  throw new Error('Expo web failed to start');
}

async function main() {
  await wakeServices();
  const only = process.argv[2];
  const scenes = only
    ? config.scenes.filter((s) => s.id === only || s.id.startsWith(only))
    : config.scenes;

  const browser = await chromium.launch({ headless: true });
  let expoStarted = false;
  const failures = [];

  for (const scene of scenes) {
    try {
      if (scene.mobile) {
        if (!process.env.MOBILE_URL && !expoStarted) {
          process.env.MOBILE_URL = await startExpoWeb();
          expoStarted = true;
        }
        await recordMobileScene(browser, scene);
      } else {
        await recordScene(browser, scene);
      }
    } catch (err) {
      failures.push({ id: scene.id, error: err.message });
    }
  }

  await browser.close();
  if (failures.length > 0) {
    console.error('Failed scenes:', failures);
    process.exit(1);
  }
  console.log('Recording complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

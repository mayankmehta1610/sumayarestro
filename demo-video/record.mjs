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
const API_BASE = BASE.replace('sumaya-web', 'sumaya-api') + '/api/v1';
const SLUG = config.slug;

const WEAK_SCENES = ['02-customer-register', '03-customer-order', '04-public-booking', '07-waiter-order', '08-kitchen', '09-cashier-billing'];

mkdirSync(outDir, { recursive: true });

async function waitForContent(page, selector, timeout = 60000) {
  await page.waitForSelector(selector, { timeout, state: 'visible' });
}

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
      const res = await fetch(API_BASE.replace('/api/v1', '') + '/health', { signal: AbortSignal.timeout(60000) });
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

async function injectAuth(page, { email, slug = SLUG, mode = 'staff', baseUrl = BASE }) {
  let data;
  if (mode === 'super') {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    if (!res.ok) throw new Error(`Super login failed: ${await res.text()}`);
    data = await res.json();
  } else if (mode === 'customer') {
    const res = await fetch(`${API_BASE}/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD, restaurant_slug: slug }),
    });
    if (!res.ok) throw new Error(`Customer login failed: ${await res.text()}`);
    data = await res.json();
    data.user = { ...data.user, restaurant_slug: slug, role: 'customer' };
  } else {
    const res = await fetch(`${API_BASE}/auth/restaurant-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD, restaurant_slug: slug }),
    });
    if (!res.ok) throw new Error(`Staff login failed: ${await res.text()}`);
    data = await res.json();
  }

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(({ token, user, branchId }) => {
    localStorage.setItem('sumaya_token', token);
    localStorage.setItem('sumaya_user', JSON.stringify(user));
    if (branchId) localStorage.setItem('sumaya_branch', branchId);
  }, { token: data.access_token, user: data.user, branchId: data.user.branch_id || null });

  if (data.user.needs_branch_selection && data.user.branches?.length) {
    const branchId = data.user.branches[0].id;
    const res = await fetch(`${API_BASE}/auth/set-branch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.access_token}`,
      },
      body: JSON.stringify({ branch_id: branchId }),
    });
    if (res.ok) {
      const updated = { ...data.user, branch_id: branchId, needs_branch_selection: false };
      await page.evaluate((user) => {
        localStorage.setItem('sumaya_user', JSON.stringify(user));
        localStorage.setItem('sumaya_branch', user.branch_id);
      }, updated);
    }
  }
}

async function customerRegisterViaApi(page) {
  const email = `demo.guest.${Date.now()}@spice-garden.com`;
  const res = await fetch(`${API_BASE}/customer/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Demo Guest',
      email,
      phone: '+91 98765 43210',
      password: PASSWORD,
      restaurant_slug: SLUG,
    }),
  });
  if (!res.ok) throw new Error(`Register failed: ${await res.text()}`);
  const data = await res.json();
  const user = { ...data.user, restaurant_slug: SLUG, role: 'customer' };
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('sumaya_token', token);
    localStorage.setItem('sumaya_user', JSON.stringify(user));
  }, { token: data.access_token, user });
}

async function staffLogin(page, email, loginPath) {
  await logout(page);
  await injectAuth(page, { email, mode: email.includes('sumayaresto.com') ? 'super' : 'staff' });
  if (loginPath) {
    await page.goto(BASE + loginPath, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(1500);
  }
}

async function customerLogin(page, email = 'customer@spice-garden.com') {
  await logout(page);
  await injectAuth(page, { email, mode: 'customer' });
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

async function gotoAndWait(page, url, scene) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(3000);
  if (page.url().includes('/login') && !url.includes('/login') && !url.includes('/book') && !url.includes('/queue-guest')) {
    console.warn(`  Redirected to login from ${url} — re-authenticating`);
    if (scene?.login) {
      await staffLogin(page, scene.login.email, scene.login.path);
    } else if (scene?.customerLogin) {
      await customerLogin(page, scene.customerLogin);
    } else if (url.includes('/order') && !url.includes('/tables/')) {
      await customerLogin(page);
    } else if (scene?.id && !scene.id.startsWith('01-')) {
      await staffLogin(page, 'waiter@spice-garden.com', `/r/${SLUG}/login`);
    }
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(4000);
  }
  await page.waitForFunction(
    () => !document.body?.innerText?.includes('Loading...') || document.querySelector('nav, aside, main h1, .card'),
    { timeout: 30000 },
  ).catch(() => {});
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
        if (action.role === 'button') {
          await page.getByRole('button', { name: new RegExp(action.text, 'i') }).first().click({ timeout: 20000 });
        } else {
          const link = page.getByRole('link', { name: action.text });
          const btn = page.getByRole('button', { name: action.text });
          if (await link.count() > 0) await link.first().click({ timeout: 15000 });
          else if (await btn.count() > 0) await btn.first().click({ timeout: 15000 });
          else await page.getByText(action.text, { exact: false }).first().click({ timeout: 12000 });
        }
      } else {
        let loc = page.locator(action.selector);
        if (action.index !== undefined) loc = loc.nth(action.index);
        else if (action.first) loc = loc.first();
        await loc.click({ timeout: 15000 });
      }
      break;
    }
    case 'fillLabel': {
      const val = String(action.value).replace(/\{\{ts\}\}/g, String(Date.now()));
      const label = page.locator('.label', { hasText: action.label });
      const field = label.locator('xpath=ancestor::div[1]//input | ancestor::div[1]//textarea').first();
      if (await field.count() > 0) {
        await field.fill(val, { timeout: 30000 });
      } else {
        await page.getByLabel(action.label, { exact: false }).fill(val, { timeout: 30000 });
      }
      break;
    }
    case 'waitFor':
      await waitForContent(page, action.selector, action.timeout || 60000);
      break;
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
    if (scene.registerViaApi) {
      await customerRegisterViaApi(page);
    } else if (scene.login) {
      await staffLogin(page, scene.login.email, scene.login.path);
    } else if (scene.customerLogin) {
      await customerLogin(page, scene.customerLogin);
    }
    await gotoAndWait(page, BASE + scene.path, scene);

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

async function recordMobileScene(browser, scene) {
  const MOBILE_URL = process.env.MOBILE_URL || 'http://localhost:19006';
  const videoDir = join(outDir, scene.id);
  mkdirSync(videoDir, { recursive: true });
  const targetSec = audioDuration(scene.id) + 0.5;
  const roleEmails = {
    waiter: 'waiter@spice-garden.com',
    kitchen_staff: 'kitchen@spice-garden.com',
    customer: 'customer@spice-garden.com',
    cashier: 'cashier@spice-garden.com',
  };
  const email = roleEmails[scene.mobileRole] || 'waiter@spice-garden.com';
  const mode = scene.mobileRole === 'customer' ? 'customer' : 'staff';

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: videoDir, size: { width: 390, height: 844 } },
    locale: 'en-IN',
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const startMs = Date.now();
  console.log(`Recording MOBILE: ${scene.id} — ${scene.title}`);

  try {
    await page.goto(MOBILE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(3000);
    await injectAuth(page, { email, mode, baseUrl: MOBILE_URL });
    await page.goto(MOBILE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(4000);

    const tabMap = { tables: 'Tables', kitchen: 'Kitchen', orders: 'Orders', pos: 'POS', 'customer-order': 'Order' };
    const tab = tabMap[scene.mobileScreen];
    if (tab) {
      await page.getByText(tab, { exact: true }).click({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    for (const action of scene.actions || []) {
      try { await runAction(page, action); } catch (err) {
        console.warn(`  Mobile action warning in ${scene.id}:`, err.message);
        await page.waitForTimeout(1500);
      }
    }
    await padToDuration(page, startMs, targetSec);
  } catch (err) {
    console.error(`  Mobile scene error ${scene.id}:`, err.message);
    await padToDuration(page, startMs, targetSec);
  }

  await context.close();
  const files = readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
  if (files.length > 0) {
    const src = join(videoDir, files[0]);
    const dest = join(outDir, `${scene.id}.webm`);
    if (existsSync(dest)) try { unlinkSync(dest); } catch { /* */ }
    renameSync(src, dest);
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
    if (res.ok) { console.log('Expo web already running'); return url; }
  } catch { /* start fresh */ }

  console.log('Starting Expo web for mobile capture...');
  const cmd = `npx expo start --web --port ${port}`;
  const child = spawn(cmd, [], {
    cwd: mobileDir,
    env: { ...process.env, EXPO_PUBLIC_API_URL: 'https://sumaya-api.onrender.com/api/v1', CI: '1' },
    stdio: 'ignore',
    shell: true,
    detached: true,
  });
  child.unref();

  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) { console.log(`Expo web ready at ${url}`); return url; }
    } catch { console.log(`  Waiting for Expo web... ${i + 1}`); }
  }
  throw new Error('Expo web failed to start');
}

async function captureMobileScreenshots(browser) {
  const MOBILE_URL = process.env.MOBILE_URL || 'http://localhost:19006';
  const shotDir = join(__dirname, 'output', 'mobile-screenshots');
  mkdirSync(shotDir, { recursive: true });
  const roles = [
    { name: 'login', mode: null },
    { name: 'waiter-tables', email: 'waiter@spice-garden.com', mode: 'staff', tab: 'Tables' },
    { name: 'waiter-pos', email: 'waiter@spice-garden.com', mode: 'staff', tab: 'POS' },
    { name: 'kitchen', email: 'kitchen@spice-garden.com', mode: 'staff', tab: 'Kitchen' },
    { name: 'orders', email: 'waiter@spice-garden.com', mode: 'staff', tab: 'Orders' },
    { name: 'customer-order', email: 'customer@spice-garden.com', mode: 'customer', tab: 'Order' },
  ];

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  for (const r of roles) {
    await page.goto(MOBILE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(2000);
    if (r.mode) {
      await page.evaluate(() => { localStorage.clear(); });
      await injectAuth(page, { email: r.email, mode: r.mode, baseUrl: MOBILE_URL });
      await page.goto(MOBILE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(3000);
      if (r.tab) await page.getByText(r.tab, { exact: true }).click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1500);
    }
    const path = join(shotDir, `${r.name}.png`);
    await page.screenshot({ path, fullPage: false });
    console.log(`  Screenshot: ${path}`);
  }
  await context.close();
}

async function main() {
  await wakeServices();
  const only = process.argv[2];
  let scenes = only === 'weak'
    ? config.scenes.filter((s) => WEAK_SCENES.includes(s.id))
    : only === 'mobile'
    ? config.scenes.filter((s) => s.mobile)
    : only
      ? config.scenes.filter((s) => s.id === only || s.id.startsWith(only))
      : config.scenes;
  const webScenes = scenes.filter((s) => !s.mobile && s.id !== '18-closing');
  const mobileScenes = scenes.filter((s) => s.mobile);
  const closingScene = scenes.find((s) => s.id === '18-closing');

  console.log(`Recording ${webScenes.length} web + ${mobileScenes.length} mobile + closing against ${BASE}`);
  const browser = await chromium.launch({ headless: true });
  for (const scene of webScenes) {
    await recordScene(browser, scene);
  }

  if (mobileScenes.length > 0) {
    if (!process.env.MOBILE_URL) process.env.MOBILE_URL = await startExpoWeb();
    for (const scene of mobileScenes) {
      await recordMobileScene(browser, scene);
    }
    if (only === 'mobile' || !only) await captureMobileScreenshots(browser);
  }

  if (closingScene && !only) {
    await recordScene(browser, closingScene);
  }

  await browser.close();
  console.log('Recording complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

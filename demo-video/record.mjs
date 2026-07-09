import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(__dirname, 'scenes.json'), 'utf8'));
const outDir = join(__dirname, 'output', 'scenes');
const PASSWORD = config.password;

mkdirSync(outDir, { recursive: true });

async function logout(page) {
  await page.goto('about:blank').catch(() => {});
  await page.evaluate(() => {
    try {
      localStorage.removeItem('sumaya_token');
      localStorage.removeItem('sumaya_user');
      localStorage.removeItem('sumaya_branch');
    } catch { /* cross-origin */ }
  }).catch(() => {});
}

async function staffLogin(page, email, loginPath) {
  await logout(page);
  await page.goto(config.baseUrl + loginPath, { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForTimeout(3000);
}

async function runAction(page, action) {
  switch (action.type) {
    case 'wait':
      await page.waitForTimeout(action.ms || 1000);
      break;
    case 'scroll':
      await page.evaluate((y) => window.scrollBy(0, y), action.y || 400);
      await page.waitForTimeout(600);
      break;
    case 'fill': {
      let el;
      if (action.selector?.includes('type=')) {
        el = page.locator(action.selector);
      } else if (action.index !== undefined) {
        el = page.locator('input').nth(action.index);
      } else {
        el = page.locator(action.selector || 'input');
      }
      await el.first().fill(action.value);
      break;
    }
    case 'click': {
      if (action.text) {
        const link = page.getByRole('link', { name: action.text });
        const btn = page.getByRole('button', { name: action.text });
        if (await link.count() > 0) {
          await link.first().click({ timeout: 8000 });
        } else if (await btn.count() > 0) {
          await btn.first().click({ timeout: 8000 });
        } else {
          await page.getByText(action.text, { exact: false }).first().click({ timeout: 5000 });
        }
      } else {
        const loc = page.locator(action.selector);
        await (action.first ? loc.first() : loc).click({ timeout: 8000 });
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

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } },
    locale: 'en-IN',
  });
  const page = await context.newPage();

  console.log(`Recording: ${scene.id} — ${scene.title}`);

  try {
    if (scene.login) {
      await staffLogin(page, scene.login.email, scene.login.path);
    }

    const url = config.baseUrl + scene.path;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(1500);

    for (const action of scene.actions || []) {
      try {
        await runAction(page, action);
      } catch (err) {
        console.warn(`  Action warning in ${scene.id}:`, err.message);
        await page.waitForTimeout(1000);
      }
    }

    await page.waitForTimeout(2000);
  } catch (err) {
    console.error(`  Scene error ${scene.id}:`, err.message);
  }

  await context.close();
  const videoPath = (await context.pages()[0]?.video()?.path()) || null;
  // Playwright saves video on context close — find the webm file
  const { readdirSync, renameSync } = await import('fs');
  const files = readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
  if (files.length > 0) {
    const src = join(videoDir, files[0]);
    const dest = join(outDir, `${scene.id}.webm`);
    if (existsSync(dest)) {
      const { unlinkSync } = await import('fs');
      try { unlinkSync(dest); } catch { /* */ }
    }
    renameSync(src, dest);
    console.log(`  Saved: ${dest}`);
  }
}

async function main() {
  const only = process.argv[2];
  const scenes = only
    ? config.scenes.filter((s) => s.id === only || s.id.startsWith(only))
    : config.scenes;

  console.log(`Recording ${scenes.length} scenes against ${config.baseUrl}`);

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

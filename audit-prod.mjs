import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:4173';
const routes = ['/', '/login', '/about', '/domains', '/ventures', '/technology', '/auctions', '/admin'];

const browser = await chromium.launch();
const page = await browser.newPage();
const allErrors = [];

page.on('pageerror', (err) => allErrors.push({ route: 'global', error: err.message }));

for (const route of routes) {
  const errors = [];
  const handler = (err) => errors.push(err.message);
  page.on('pageerror', handler);

  try {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1500);
    const rootLen = await page.$eval('#root', (el) => el.innerHTML.length);
    const hasContent = rootLen > 100;
    console.log(`${route}: root=${rootLen} ${hasContent ? 'OK' : 'EMPTY'}${errors.length ? ` ERR=${errors[0]}` : ''}`);
    if (errors.length) allErrors.push({ route, error: errors[0] });
  } catch (e) {
    console.log(`${route}: TIMEOUT/FAIL ${e.message}`);
    allErrors.push({ route, error: e.message });
  }

  page.off('pageerror', handler);
}

console.log('---');
console.log('Total route errors:', allErrors.length);
await browser.close();

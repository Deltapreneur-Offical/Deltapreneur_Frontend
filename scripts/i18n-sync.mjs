/**
 * Sync locale files: preserve existing translations, add missing keys from en-IN.
 * Usage: node scripts/i18n-sync.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '../src/i18n/locales');
const enIN = JSON.parse(fs.readFileSync(path.join(localesDir, 'en-IN.json'), 'utf8'));

const localeFiles = fs.readdirSync(localesDir).filter((f) => f.endsWith('.json') && f !== 'en-IN.json');

for (const file of localeFiles) {
  const filePath = path.join(localesDir, file);
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  // Add only missing keys — never overwrite existing translations
  const merged = { ...existing };
  let added = 0;
  for (const [key, value] of Object.entries(enIN)) {
    if (!(key in merged)) {
      merged[key] = value;
      added += 1;
    }
  }
  fs.writeFileSync(filePath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  const translated = Object.keys(existing).length;
  const total = Object.keys(merged).length;
  console.log(`${file}: ${Object.keys(existing).length} existing + ${added} new = ${total} keys`);
}

console.log('Done. en-IN keys:', Object.keys(enIN).length);

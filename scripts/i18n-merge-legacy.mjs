/**
 * Restore human translations from src/locales/*.json into src/i18n/locales/*.json
 * (legacy folder wins on key conflicts).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const legacyDir = path.join(__dirname, '../src/locales');
const canonicalDir = path.join(__dirname, '../src/i18n/locales');

if (!fs.existsSync(legacyDir)) {
  console.log('No legacy locales folder.');
  process.exit(0);
}

for (const file of fs.readdirSync(legacyDir).filter((f) => f.endsWith('.json'))) {
  const legacyPath = path.join(legacyDir, file);
  const canonPath = path.join(canonicalDir, file);
  if (!fs.existsSync(canonPath)) continue;

  const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
  const canon = JSON.parse(fs.readFileSync(canonPath, 'utf8'));
  const merged = { ...canon, ...legacy };
  fs.writeFileSync(canonPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  console.log(`${file}: restored ${Object.keys(legacy).length} legacy keys`);
}

console.log('Done.');

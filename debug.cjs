const fs = require('fs');
const path = require('path');
const baseDir = path.join(__dirname, 'src', 'i18n', 'locales');
const file = 'en-US.json';
const filePath = path.join(baseDir, file);
const buf = fs.readFileSync(filePath);
const content = buf.toString('utf8');

const hasCRLF = content.includes('\r\n');
const lineEnding = hasCRLF ? '\r\n' : '\n';
const lines = content.split(lineEnding);

const results = [];
let checked = 0;
let keyMatched = 0;
for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i];
    const colonIdx = line.indexOf('": ');
    results.push('Line ' + i + ': colonIdx=' + colonIdx + ' len=' + line.length);
    if (colonIdx >= 0) {
        checked++;
        const beforeColon = line.substring(0, colonIdx);
        const keyMatch = beforeColon.match(/"([^"]*)"$/);
        results.push('  beforeColon=' + JSON.stringify(beforeColon.substring(0, 40)));
        results.push('  keyMatch=' + JSON.stringify(keyMatch ? keyMatch[1] : null));
        if (keyMatch) {
            keyMatched++;
            const afterKey = line.substring(colonIdx + 3);
            results.push('  afterKey=' + JSON.stringify(afterKey.substring(0, 60)));
            const valMatches = afterKey.match(/CoBrother/g);
            results.push('  valMatches=' + JSON.stringify(valMatches));
        }
    }
}
results.push('checked=' + checked + ' keyMatched=' + keyMatched);

fs.writeFileSync(path.join(__dirname, 'debug-output.txt'), results.join('\n'), 'utf8');

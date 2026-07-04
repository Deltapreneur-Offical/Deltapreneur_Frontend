const fs = require('fs');
const path = require('path');
const baseDir = path.join(__dirname, 'src', 'i18n', 'locales');
const files = ['en-US.json', 'en-GB.json', 'de.json', 'fr.json', 'zh.json', 'hi.json', 'ur.json', 'pt.json'];

for (const file of files) {
    const filePath = path.join(baseDir, file);
    const buf = fs.readFileSync(filePath);
    const content = buf.toString('utf8');

    const hasCRLF = content.includes('\r\n');
    const lineEnding = hasCRLF ? '\r\n' : '\n';

    const lines = content.split(lineEnding);
    let replacements = 0;
    const newLines = lines.map(line => {
        const colonIdx = line.indexOf('": ');
        if (colonIdx < 0) return line;
        const beforeColon = line.substring(0, colonIdx);
        const keyMatch = beforeColon.match(/"([^"]*)"$/);
        if (!keyMatch) return line;
        const afterKey = line.substring(colonIdx + 3);
        const valMatches = afterKey.match(/CoBrother/g);
        if (valMatches) {
            replacements += valMatches.length;
            return line.substring(0, colonIdx + 3) + afterKey.replace(/CoBrother/g, 'Co\u0180rother');
        }
        return line;
    });

    const newContent = newLines.join(lineEnding);
    fs.writeFileSync(filePath, Buffer.from(newContent, 'utf8'));
    console.log(file + ': ' + replacements + ' replacements');
}

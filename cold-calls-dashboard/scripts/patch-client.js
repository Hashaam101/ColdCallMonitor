const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
    console.error('Usage: node patch-client.js <path>');
    process.exit(1);
}

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Look for the specific catch block
    // We search for "catch (e) { console.error(e); }" with generous whitespace matching
    const searchPattern = /catch\s*\(([^)]+)\)\s*\{\s*console\.error\(\1\);/g;

    if (!searchPattern.test(content)) {
        console.log('Pattern not found. Maybe already patched or file changed?');
        // fallback to simple string replacement
        const simplePattern = 'console.error(e);';
        if (content.includes(simplePattern)) {
            content = content.replace(simplePattern, 'console.error("[Appwrite Realtime Error]:", e);');
            console.log('Patched using simple replacement.');
        } else {
            console.error('Could not find code to patch.');
            process.exit(1);
        }
    } else {
        content = content.replace(searchPattern, (match, varName) => {
            return `catch (${varName}) { console.error("[Appwrite Realtime Error]:", ${varName});`;
        });
        console.log('Patched using regex replacement.');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully patched client.ts');

} catch (error) {
    console.error('Error patching file:', error.message);
    process.exit(1);
}

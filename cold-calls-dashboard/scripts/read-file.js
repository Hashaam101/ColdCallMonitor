const fs = require('fs');

const filePath = process.argv[2];
const startLine = parseInt(process.argv[3] || '1', 10);
const endLine = parseInt(process.argv[4] || '1000', 10);

if (!filePath) {
    console.error('Usage: node read-file.js <path> [startLine] [endLine]');
    process.exit(1);
}

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // 0-indexed slice
    const slice = lines.slice(startLine - 1, endLine);

    slice.forEach((line, index) => {
        console.log(`${startLine + index}: ${line}`);
    });
} catch (error) {
    console.error('Error reading file:', error.message);
    process.exit(1);
}

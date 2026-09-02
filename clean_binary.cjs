const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ScanReceipt.tsx');
let raw = fs.readFileSync(filePath);

console.log('Original size:', raw.length);

const cleaned = [];
let removedCount = 0;
for (let i = 0; i < raw.length; i++) {
  const b = raw[i];
  // Allow normal printable characters, tab (9), lf (10), cr (13)
  if (b >= 32 || b === 9 || b === 10 || b === 13) {
    cleaned.push(b);
  } else {
    removedCount++;
  }
}

console.log('Removed control characters:', removedCount);

if (removedCount > 0) {
  fs.writeFileSync(filePath, Buffer.from(cleaned));
  console.log('Successfully wrote cleaned file. New size:', cleaned.length);
} else {
  console.log('No bad control characters found.');
}

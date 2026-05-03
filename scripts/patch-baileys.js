const fs = require('fs');
const path = './node_modules/@whiskeysockets/baileys/lib/Utils/validate-connection.js';

if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');
  if (content.includes('passive: true')) {
    content = content.replace('passive: true', 'passive: false');
    fs.writeFileSync(path, content);
    console.log('Baileys passive bug patched successfully!');
  } else {
    console.log('Baileys passive bug already patched or not found.');
  }
} else {
  console.error('Baileys validate-connection.js not found at ' + path);
}

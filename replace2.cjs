const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const replaced = content.replace(/focus:ring-amber-500/g, 'focus:ring-[#b48b59]').replace(/text-amber-600/g, 'text-[#b48b59]');
fs.writeFileSync('src/App.tsx', replaced);

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/AI Exam Forge/g, 'EXAM AUTHOR');
code = code.replace(/indigo/g, 'amber');
fs.writeFileSync('src/App.tsx', code);

const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:m-0">/,
  '<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:m-0">\n        <AnimatePresence mode="wait">'
);

content = content.replace(
  /\{activeTab === 'create' && \(\n          <div className="max-w-3xl/,
  "{activeTab === 'create' && (\n          <motion.div key=\"create\" initial={{opacity:0, y: 10}} animate={{opacity:1, y: 0}} exit={{opacity:0, y:-10}} className=\"max-w-3xl"
);

content = content.replace(
  /<\/div>\n        \)}\n\n        {\/\* TAB: PAPER/,
  '</motion.div>\n        )}\n\n        {/* TAB: PAPER'
);

content = content.replace(
  /\{activeTab === 'paper' && questions.length > 0 && \(\n          <div className="max-w-4xl/,
  "{activeTab === 'paper' && questions.length > 0 && (\n          <motion.div key=\"paper\" initial={{opacity:0, y: 10}} animate={{opacity:1, y: 0}} exit={{opacity:0, y:-10}} className=\"max-w-4xl"
);

content = content.replace(
  /          <\/div>\n        \)}\n\n        {\/\* TAB: ANALYTICS/,
  '          </motion.div>\n        )}\n\n        {/* TAB: ANALYTICS'
);

content = content.replace(
  /\{activeTab === 'analytics' && questions.length > 0 && \(\n          <div className="space-y-6/,
  "{activeTab === 'analytics' && questions.length > 0 && (\n          <motion.div key=\"analytics\" initial={{opacity:0, y: 10}} animate={{opacity:1, y: 0}} exit={{opacity:0, y:-10}} className=\"space-y-6"
);

content = content.replace(
  /          <\/div>\n        \)}\n      <\/main>/,
  '          </motion.div>\n        )}\n        </AnimatePresence>\n      </main>'
);

fs.writeFileSync('src/App.tsx', content);

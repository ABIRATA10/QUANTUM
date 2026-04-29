import fs from 'fs';

let content = fs.readFileSync('src/services/geminiService.ts', 'utf8');

content = content.replace(
  /export interface PaperGenerationParams \{/,
  `export interface PaperGenerationParams {
  topicTagsInput?: string;`
);

content = content.replace(
  /\$\{params\.topics\}/,
  `\${params.topics} \${params.topicTagsInput ? '- Use these specific topic tags: ' + params.topicTagsInput : ''}`
);

// Instruct model to populate topicTags
content = content.replace(
  /1\. Generate a diverse set of questions in \$\{params\.language\}\./,
  `1. Generate a diverse set of questions in \${params.language}.
1a. CRITICAL: For each question, YOU MUST provide an array of exactly 1-3 strings in the 'topicTags' field, representing the topics it covers.`
);

fs.writeFileSync('src/services/geminiService.ts', content);

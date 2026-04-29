import fs from 'fs';
let content = fs.readFileSync('src/services/geminiService.ts', 'utf8');

content += `
export async function getRecommendedQuestions(params: PaperGenerationParams, currentQuestions: GeneratedQuestion[]): Promise<GeneratedQuestion[]> {
  const prompt = \`
You are an expert academic curriculum designer. Based on the current exam paper configuration, recommend 3 highly relevant and interesting questions that could be added to this paper.
These questions should cover important concepts from the topics but NOT repeat any existing questions.

Context for the Exam Paper:
- Subject: \${params.subject}
- Grade/Level: \${params.gradeLevel}
- Topics Covered: \${params.topics}

Existing Questions (Do NOT repeat these):
\${currentQuestions.slice(0, 10).map(q => '- ' + q.text).join('\\n')}

Requirements:
1. Provide exactly 3 recommended questions.
2. Ensure they are a mix of difficulties and types.
3. Output as JSON.
\`;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: questionSchema,
        temperature: 0.7,
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return parsed.questions as GeneratedQuestion[];
    }
    return [];
  } catch (error) {
    console.error("Error generating recommended questions:", error);
    return [];
  }
}
`;
fs.writeFileSync('src/services/geminiService.ts', content);

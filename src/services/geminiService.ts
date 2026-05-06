import { GoogleGenAI, Type, Schema } from '@google/genai';

function getAI() {
  const envKey = process.env.GEMINI_API_KEY;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : null;
  const apiKey = envKey || localKey;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please provide your Gemini API key in the settings.");
  }
  return new GoogleGenAI({ apiKey });
}

export interface GeneratedQuestion {
  id: string;
  type: 'descriptive' | 'mcq';
  text: string;
  options?: string[];
  subQuestions?: string[];
  hasOrChoice?: boolean;
  orType?: 'descriptive' | 'mcq';
  orText?: string;
  orOptions?: string[];
  orSubQuestions?: string[];
  marks: number;
  blooms_taxonomy: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topicTags?: string[];
}

export interface PaperGenerationParams {
  topicTagsInput?: string;
  allowedMarks?: number[];
  numberOfQuestions?: number;
  examTitle: string;
  examSubtitle: string;
  subjectCode: string;
  duration: string;
  language: string;
  subject: string;
  gradeLevel: string;
  topics: string;
  totalMarks: number;
  marksPattern?: string;
  questionFormats: string;
  includeOrChoices: boolean;
  difficultyLevels: { easy: number; medium: number; hard: number };
  pastQuestionsToAvoid: string;
}

const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      description: "List of generated questions for the exam paper.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "A unique identifier for the question (e.g. q1, q2)" },
          type: { type: Type.STRING, enum: ['descriptive', 'mcq'], description: "Type of question" },
          text: { type: Type.STRING, description: "The actual question text" },
          subQuestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of sub-questions for descriptive questions (e.g., ['(a) Explain X', '(b) Explain Y']). Optional." },
          options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of exactly 4 options if type is mcq. Omit if descriptive." },
          hasOrChoice: { type: Type.BOOLEAN, description: "Set to true if providing an internal 'OR' alternative for this question." },
          orType: { type: Type.STRING, enum: ['descriptive', 'mcq'], description: "Type of the OR alternative question" },
          orText: { type: Type.STRING, description: "The alternative question text if hasOrChoice is true" },
          orSubQuestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of sub-questions for the OR alternative. Optional." },
          orOptions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Options for the alternative question if orType is mcq" },
          marks: { type: Type.INTEGER, description: "Marks allocated to this question" },
          blooms_taxonomy: {
            type: Type.STRING,
            enum: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
            description: "The cognitive level according to Bloom's Taxonomy"
          },
          difficulty: {
            type: Type.STRING,
            enum: ['Easy', 'Medium', 'Hard'],
            description: "The difficulty level of the question"
          },
          topicTags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "1-3 specific topic tags summarizing the content of this question."
          }
        },
        required: ["id", "type", "text", "marks", "blooms_taxonomy", "difficulty"]
      }
    }
  },
  required: ["questions"]
};


function parseCleanJSON(text: string) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return JSON.parse(cleaned.trim());
}

export async function generateQuestionPaper(params: PaperGenerationParams): Promise<GeneratedQuestion[]> {
  const sumWeights = params.difficultyLevels.easy + params.difficultyLevels.medium + params.difficultyLevels.hard || 1;
  const easyPct = Math.round((params.difficultyLevels.easy / sumWeights) * 100);
  const mediumPct = Math.round((params.difficultyLevels.medium / sumWeights) * 100);
  const hardPct = Math.round((params.difficultyLevels.hard / sumWeights) * 100);

  const prompt = `
You are an expert academic curriculum designer and exam creator. 
Create an exam paper for the following context:
- Subject: ${params.subject} (Code: ${params.subjectCode})
- Grade/Level: ${params.gradeLevel}
- Topics Covered: ${params.topics} ${params.topicTagsInput ? '- Use these specific topic tags: ' + params.topicTagsInput : ''}
- Question Formats allowed: ${params.questionFormats}
- Total Marks for the Paper: ${params.totalMarks}
${params.numberOfQuestions ? `- Number of Questions Required: ${params.numberOfQuestions}` : ''}
${params.allowedMarks && params.allowedMarks.length > 0 ? `- Allowed Marks per Question: Only ${params.allowedMarks.join(', ')}` : ''}
${params.marksPattern ? `- Requested Marks Pattern: ${params.marksPattern}` : ''}
- Language: ${params.language}

Requirements:
1. Generate a diverse set of questions in ${params.language}.
1a. CRITICAL: For each question, YOU MUST provide an array of exactly 1-3 strings in the 'topicTags' field, representing the topics it covers.
1b. CRITICAL: If the topic involves current events, you MUST fetch and include very recent, confirmed news, up to the last 2 minutes if possible. Ensure ground truth accuracy.
${params.allowedMarks && params.allowedMarks.length > 0 ? `1c. CRITICAL: The marks for EVERY question MUST be exactly one of the requested values: [${params.allowedMarks.join(', ')}]. Do NOT use any other mark values.` : ''}
${params.numberOfQuestions ? `1d. CRITICAL: You MUST generate EXACTLY ${params.numberOfQuestions} questions.` : ''}
2. The total sum of marks for all questions MUST EXACTLY equal ${params.totalMarks}.
${params.marksPattern ? `3. You MUST STRONGLY ADHERE to the requested marks pattern: ${params.marksPattern}` : ''}
4. Follow this approximate difficulty distribution: ${easyPct}% Easy, ${mediumPct}% Medium, ${hardPct}% Hard.
5. Ensure a good mix of Bloom's Taxonomy levels appropriate for the difficulty.
6. Provide the output in structured JSON.
7. For 'mcq' type questions, you MUST provide exactly 4 options in the 'options' array.
${params.includeOrChoices ? `8. CRITICAL: You MUST include internal alternatives ("OR" choices) for approximately 20-30% of the questions.
   - To do this, set 'hasOrChoice' to true.
   - Provide the type of the alternative question in 'orType'.
   - Provide the text of the alternative question in 'orText'.
   - If the alternative is an MCQ, provide exactly 4 options in 'orOptions'.
   - The alternative question MUST carry the SAME marks as the primary question.` : ""}
9. If a question carries more than 5 marks and is descriptive, STRONGLY CONSIDER breaking it down into sub-parts using the 'subQuestions' array (e.g. ["a) ...", "b) ..."]). Similarly use 'orSubQuestions' for the OR alternative if applicable.

10. CRITICAL: Order the questions in the output array in ascending order according to their mark weightage (i.e. 1 mark questions first, then 2 marks, then 5 marks, etc.).
${params.pastQuestionsToAvoid ? `CRITICAL: Ensure that NONE of the following past questions or highly similar variants are included in the new paper:\n${params.pastQuestionsToAvoid}` : ''}
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: questionSchema,
        temperature: 0.7,
      }
    });

    if (response.text) {
      const parsed = parseCleanJSON(response.text);
      return parsed.questions as GeneratedQuestion[];
    }
    return [];
  } catch (error) {
    console.error("Error generating question paper:", error);
    throw new Error("Failed to generate question paper: " + (error instanceof Error ? error.message : String(error)));
  }
}

export async function regenerateSingleQuestion(
  question: GeneratedQuestion, 
  contextParams: PaperGenerationParams, 
  allCurrentQuestions: GeneratedQuestion[]
): Promise<GeneratedQuestion> {
  const prompt = `
You are an expert academic curriculum designer. I need you to replace a specific question in an exam paper with a new one.

Original Question to replace: "${question.text}" (Marks: ${question.marks}, Difficulty: ${question.difficulty}, Bloom's: ${question.blooms_taxonomy})

Context for the Exam Paper:
- Subject: ${contextParams.subject}
- Grade/Level: ${contextParams.gradeLevel}
- Topics Covered: ${contextParams.topics}

Requirements:
1. Provide exactly ONE new question to replace the original.
2. It MUST be worth exactly ${question.marks} marks.
3. It SHOULD ideally target a similar difficulty (${question.difficulty}) and Bloom's Taxonomy level (${question.blooms_taxonomy}), but you can vary it slightly if it fits the topic better.
4. If type is 'mcq', you MUST provide exactly 4 options in the 'options' array.
${contextParams.includeOrChoices ? "5. You may also include an 'OR' alternative via 'hasOrChoice', 'orType', 'orText', 'orOptions'." : ""}
6. DO NOT repeat any of the following questions currently in the paper:
${allCurrentQuestions.map(q => '- ' + q.text).join('\n')}

Output as a structured JSON object matching the requested schema.
  `;

  const singleQuestionSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      type: { type: Type.STRING, enum: ['descriptive', 'mcq'] },
      text: { type: Type.STRING },
      subQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
      hasOrChoice: { type: Type.BOOLEAN },
      orType: { type: Type.STRING, enum: ['descriptive', 'mcq'] },
      orText: { type: Type.STRING },
      orSubQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
      orOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
      marks: { type: Type.INTEGER },
      blooms_taxonomy: {
        type: Type.STRING,
        enum: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
      },
      difficulty: {
        type: Type.STRING,
        enum: ['Easy', 'Medium', 'Hard'],
      },
      topicTags: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
    required: ["id", "type", "text", "marks", "blooms_taxonomy", "difficulty"]
  };

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: singleQuestionSchema,
        temperature: 0.7,
      }
    });

    if (response.text) {
      const parsed = parseCleanJSON(response.text);
      return {
        ...parsed,
        id: Math.random().toString(36).substring(7) // regenerate a new ID
      } as GeneratedQuestion;
    }
    throw new Error("Empty response");
  } catch (error) {
    console.error("Error regenerating question:", error);
    throw new Error("Failed to regenerate question: " + (error instanceof Error ? error.message : String(error)));
  }
}

export async function getRecommendedQuestions(params: PaperGenerationParams, currentQuestions: GeneratedQuestion[]): Promise<GeneratedQuestion[]> {
  const prompt = `
You are an expert academic curriculum designer. Based on the current exam paper configuration, recommend 3 highly relevant and interesting questions that could be added to this paper.
These questions should cover important concepts from the topics but NOT repeat any existing questions.

Context for the Exam Paper:
- Subject: ${params.subject}
- Grade/Level: ${params.gradeLevel}
- Topics Covered: ${params.topics}

Existing Questions (Do NOT repeat these):
${currentQuestions.slice(0, 10).map(q => '- ' + q.text).join('\n')}

Requirements:
1. Provide exactly 3 recommended questions.
2. Ensure they are a mix of difficulties and types.
3. Output as JSON.
`;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: questionSchema,
        temperature: 0.7,
      }
    });

    if (response.text) {
      const parsed = parseCleanJSON(response.text);
      return parsed.questions as GeneratedQuestion[];
    }
    return [];
  } catch (error) {
    console.error("Error generating recommended questions:", error);
    return [];
  }
}

import { GoogleGenAI, Type, Schema } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface GeneratedQuestion {
  id: string;
  type: 'descriptive' | 'mcq';
  text: string;
  options?: string[];
  hasOrChoice?: boolean;
  orType?: 'descriptive' | 'mcq';
  orText?: string;
  orOptions?: string[];
  marks: number;
  blooms_taxonomy: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface PaperGenerationParams {
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
          options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of exactly 4 options if type is mcq. Omit if descriptive." },
          hasOrChoice: { type: Type.BOOLEAN, description: "Set to true if providing an internal 'OR' alternative for this question." },
          orType: { type: Type.STRING, enum: ['descriptive', 'mcq'], description: "Type of the OR alternative question" },
          orText: { type: Type.STRING, description: "The alternative question text if hasOrChoice is true" },
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
          }
        },
        required: ["id", "type", "text", "marks", "blooms_taxonomy", "difficulty"]
      }
    }
  },
  required: ["questions"]
};

export async function generateQuestionPaper(params: PaperGenerationParams): Promise<GeneratedQuestion[]> {
  const prompt = `
You are an expert academic curriculum designer and exam creator. 
Create an exam paper for the following context:
- Subject: ${params.subject} (Code: ${params.subjectCode})
- Grade/Level: ${params.gradeLevel}
- Topics Covered: ${params.topics}
- Question Formats allowed: ${params.questionFormats}
- Total Marks for the Paper: ${params.totalMarks}
${params.marksPattern ? `- Requested Marks Pattern: ${params.marksPattern}` : ''}
- Language: ${params.language}

Requirements:
1. Generate a diverse set of questions in ${params.language}.
2. The total sum of marks for all questions MUST EXACTLY equal ${params.totalMarks}.
${params.marksPattern ? `3. You MUST STRONGLY ADHERE to the requested marks pattern: ${params.marksPattern}` : ''}
4. Follow this approximate difficulty distribution: ${params.difficultyLevels.easy}% Easy, ${params.difficultyLevels.medium}% Medium, ${params.difficultyLevels.hard}% Hard.
5. Ensure a good mix of Bloom's Taxonomy levels appropriate for the difficulty.
6. Provide the output in structured JSON.
7. For 'mcq' type questions, you MUST provide exactly 4 options in the 'options' array.
${params.includeOrChoices ? `8. CRITICAL: You MUST include internal alternatives ("OR" choices) for approximately 20-30% of the questions.
   - To do this, set 'hasOrChoice' to true.
   - Provide the type of the alternative question in 'orType'.
   - Provide the text of the alternative question in 'orText'.
   - If the alternative is an MCQ, provide exactly 4 options in 'orOptions'.
   - The alternative question MUST carry the SAME marks as the primary question.` : ""}

${params.pastQuestionsToAvoid ? `CRITICAL: Ensure that NONE of the following past questions or highly similar variants are included in the new paper:\n${params.pastQuestionsToAvoid}` : ''}
  `;

  try {
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
    console.error("Error generating question paper:", error);
    throw new Error("Failed to generate question paper. Please try again.");
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
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
      hasOrChoice: { type: Type.BOOLEAN },
      orType: { type: Type.STRING, enum: ['descriptive', 'mcq'] },
      orText: { type: Type.STRING },
      orOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
      marks: { type: Type.INTEGER },
      blooms_taxonomy: {
        type: Type.STRING,
        enum: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
      },
      difficulty: {
        type: Type.STRING,
        enum: ['Easy', 'Medium', 'Hard'],
      }
    },
    required: ["id", "type", "text", "marks", "blooms_taxonomy", "difficulty"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: singleQuestionSchema,
        temperature: 0.7,
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return {
        ...parsed,
        id: Math.random().toString(36).substring(7) // regenerate a new ID
      } as GeneratedQuestion;
    }
    throw new Error("Empty response");
  } catch (error) {
    console.error("Error regenerating question:", error);
    throw new Error("Failed to regenerate question. Please try again.");
  }
}

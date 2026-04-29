import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. imports
content = content.replace(
  /regenerateSingleQuestion } from '.\/services\/geminiService';/,
  "regenerateSingleQuestion, getRecommendedQuestions } from './services/geminiService';"
);
content = content.replace(
  /import \{ Settings, FileText/,
  "import { History, Lightbulb, Settings, FileText"
);

// 2. Interfaces
content = content.replace(
  /function App\(\) \{/,
  `interface ExamHistoryItem {
  id: string;
  createdAt: string;
  params: PaperGenerationParams;
  questions: GeneratedQuestion[];
}

function App() {`
);

// 3. State hooks
content = content.replace(
  /const \[activeTab, setActiveTab\] = useState<'create' \| 'paper' \| 'analytics'>\('create'\);/,
  `const [activeTab, setActiveTab] = useState<'create' | 'paper' | 'analytics'>('create');
  const [history, setHistory] = useState<ExamHistoryItem[]>(() => {
    const saved = localStorage.getItem('exam-history');
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => {
    localStorage.setItem('exam-history', JSON.stringify(history));
  }, [history]);

  const [recommendedQuestions, setRecommendedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isFetchingRecommended, setIsFetchingRecommended] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
`
);

// 4. Update the params initial state
content = content.replace(
  /pastQuestionsToAvoid: 'Explain Bubble Sort.\\nWhat is a Binary Search Tree\?'\n  \}\);/,
  `pastQuestionsToAvoid: 'Explain Bubble Sort.\\nWhat is a Binary Search Tree?',
    topicTagsInput: 'Algorithms, Trees, Graphs'
  });`
);

// 5. Update generate handler
content = content.replace(
  /      const newQuestions = await generateQuestionPaper\(params\);\n      setQuestions\(newQuestions\);\n      setActiveTab\('paper'\);/,
  `      const newQuestions = await generateQuestionPaper(params);
      setQuestions(newQuestions);
      
      const newHistoryItem: ExamHistoryItem = {
        id: Math.random().toString(36).substring(7),
        createdAt: new Date().toISOString(),
        params: {...params},
        questions: newQuestions
      };
      setHistory(prev => [newHistoryItem, ...prev]);

      setActiveTab('paper');
      setSelectedTags([]);

      // Fetch recommended questions
      setIsFetchingRecommended(true);
      getRecommendedQuestions(params, newQuestions).then(recs => {
        setRecommendedQuestions(recs);
      }).catch(err => console.error(err)).finally(() => setIsFetchingRecommended(false));
`
);

// 6. Provide the filtered questions
content = content.replace(
  /const currentTotalMarks = questions.reduce\(\(sum, q\) => sum \+ q.marks, 0\);/,
  `const availableTags = Array.from(new Set(questions.flatMap(q => q.topicTags || [])));
  const filteredQuestions = selectedTags.length > 0 
    ? questions.filter(q => q.topicTags?.some(tag => selectedTags.includes(tag)))
    : questions;
  const currentTotalMarks = filteredQuestions.reduce((sum, q) => sum + q.marks, 0);`
);

// 7. Update rendering of questions with filteredQuestions
content = content.replace(
  /questions\.forEach\(\(q, index\)/g,
  `filteredQuestions.forEach((q, index)`
);
content = content.replace(
  /questions\.map\(\(q, i\)/g,
  `filteredQuestions.map((q, i)`
);
content = content.replace(
  /questions\.filter/g,
  `filteredQuestions.filter`
);
// In the map where questions are rendered in Paper view:
content = content.replace(
  /\{questions\.map\(\(q, index\) => \(/g,
  `{filteredQuestions.map((q, index) => (`
);

// 8. Add the UI for topicTagsInput in settings
content = content.replace(
  /<div className="space-y-4">/,
  `<div className="space-y-4">
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <label className="text-sm font-medium text-neutral-700">Topic Tags for Filtering (Optional)</label>
                    <input
                      type="text"
                      value={params.topicTagsInput}
                      onChange={(e) => setParams({ ...params, topicTagsInput: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b48b59] focus:border-transparent text-sm"
                      placeholder="e.g. Hooks, Context API, Redux"
                    />
                    <p className="text-xs text-neutral-500">Provide comma-separated tags you want the AI to apply to generated questions.</p>
                  </div>`
);

// 9. Add the Tag Filter UI in Paper tab header
content = content.replace(
  /<div className="flex justify-between items-center mb-6 print:hidden">/,
  `<div className="flex justify-between items-center mb-6 print:hidden">
              <div className="flex flex-col space-y-2">
                <h2 className="text-2xl font-bold text-neutral-900">Generated Exam Paper</h2>
                {availableTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-neutral-500">Filter by Topics:</span>
                    {availableTags.map(tag => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button 
                          key={tag}
                          onClick={() => {
                            if (isSelected) setSelectedTags(selectedTags.filter(t => t !== tag));
                            else setSelectedTags([...selectedTags, tag]);
                          }}
                          className={\`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors \${isSelected ? 'bg-[#b48b59] text-white border-[#b48b59]' : 'bg-white text-neutral-600 border-neutral-300 hover:border-[#b48b59]'}\`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>`
);
content = content.replace(
  /<h2 className="text-2xl font-bold text-neutral-900">Generated Exam Paper<\/h2>/,
  `` // remove the old one since it's added in the replacement above
);


// 10. Render topic tags in each question
content = content.replace(
  /\{q\.difficulty\}<span className="mx-1">•<\/span>\{q\.blooms_taxonomy\}/g,
  `{q.difficulty}<span className="mx-1">•</span>{q.blooms_taxonomy}
                      {q.topicTags && q.topicTags.length > 0 && (
                        <>
                          <span className="mx-1">•</span>
                          <span className="text-neutral-500 font-mono">{q.topicTags.join(', ')}</span>
                        </>
                      )}`
);

fs.writeFileSync('src/App.tsx', content);

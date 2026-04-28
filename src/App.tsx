import React, { useState, useRef } from 'react';
import { Settings, FileText, BarChart3, Printer, RefreshCw, AlertCircle, Sparkles, BookOpen, Edit2, Trash2, Plus, Loader2, ArrowRight, Save, X, Download, ImageIcon, FileType, ChevronDown, File } from 'lucide-react';
import { generateQuestionPaper, GeneratedQuestion, PaperGenerationParams, regenerateSingleQuestion } from './services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import html2canvas from 'html2canvas';

function App() {
  const [activeTab, setActiveTab] = useState<'create' | 'paper' | 'analytics'>('create');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);
  
  const [params, setParams] = useState<PaperGenerationParams>({
    examTitle: 'Mid-Term Examination 2026',
    examSubtitle: 'Department of Computer Science',
    subjectCode: 'CS201',
    duration: '3 Hours',
    language: 'English',
    subject: 'Computer Science',
    gradeLevel: 'Undergraduate Year 2',
    topics: 'Data Structures, Searching Algorithms, Sorting Algorithms',
    totalMarks: 50,
    marksPattern: '',
    questionFormats: 'Short Answer, Long Answer, MCQs',
    includeOrChoices: false,
    difficultyLevels: { easy: 30, medium: 50, hard: 20 },
    pastQuestionsToAvoid: 'Explain Bubble Sort.\nWhat is a Binary Search Tree?'
  });

  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [isRegeneratingId, setIsRegeneratingId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestionData, setEditingQuestionData] = useState<GeneratedQuestion | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      if (params.difficultyLevels.easy + params.difficultyLevels.medium + params.difficultyLevels.hard !== 100) {
        throw new Error("Difficulty levels must sum up to 100%");
      }
      const newQuestions = await generateQuestionPaper(params);
      setQuestions(newQuestions);
      setActiveTab('paper');
    } catch (err: any) {
      setError(err.message || 'An error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateQuestion = async (qs: GeneratedQuestion) => {
    setIsRegeneratingId(qs.id);
    try {
      const newQuestion = await regenerateSingleQuestion(qs, params, questions);
      setQuestions(current => current.map(q => q.id === qs.id ? newQuestion : q));
    } catch (err: any) {
      alert("Failed to regenerate: " + err.message);
    } finally {
      setIsRegeneratingId(null);
    }
  };

  const handleEditClick = (q: GeneratedQuestion) => {
    setEditingQuestionId(q.id);
    setEditingQuestionData({ ...q });
  };

  const handleSaveEdit = () => {
    if (editingQuestionData && editingQuestionId !== null) {
      setQuestions(current => current.map(q => q.id === editingQuestionId ? editingQuestionData : q));
    }
    setEditingQuestionId(null);
    setEditingQuestionData(null);
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setEditingQuestionData(null);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(current => current.filter(q => q.id !== id));
  };

  const handleAddQuestion = () => {
    const newQ: GeneratedQuestion = {
      id: Math.random().toString(36).substring(7),
      type: 'descriptive',
      text: 'New Question... (Edit me)',
      marks: 5,
      difficulty: 'Medium',
      blooms_taxonomy: 'Apply'
    };
    setQuestions(current => [...current, newQ]);
    handleEditClick(newQ);
  };

  const currentTotalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  // Analytics Data Preparation
  const COLORS = {
    Easy: '#22c55e',
    Medium: '#eab308',
    Hard: '#ef4444'
  };

  const BLOOMS_COLORS = {
    Remember: '#93c5fd',
    Understand: '#60a5fa',
    Apply: '#3b82f6',
    Analyze: '#2563eb',
    Evaluate: '#1d4ed8',
    Create: '#1e3a8a'
  };

  const difficultyData = ['Easy', 'Medium', 'Hard'].map(level => {
    const totalMarksForLevel = questions.filter(q => q.difficulty === level).reduce((sum, q) => sum + q.marks, 0);
    return { name: level, value: totalMarksForLevel };
  }).filter(d => d.value > 0);

  const bloomsData = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'].map(level => {
    const totalMarks = questions.filter(q => q.blooms_taxonomy === level).reduce((sum, q) => sum + q.marks, 0);
    return { name: level, value: totalMarks };
  }).filter(d => d.value > 0);

  const saveFile = async (blob: Blob, defaultName: string, mimeType: string, extension: string) => {
    try {
      // @ts-ignore
      if (window.showSaveFilePicker) {
        // @ts-ignore
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultName,
          types: [{
            description: extension.toUpperCase() + ' File',
            accept: { [mimeType]: ['.' + extension] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Failed to save file', err);
        alert('Failed to save file.');
      }
    }
  };

  const generatePlainText = () => {
    let text = `${params.examSubtitle}\n`;
    text += `${params.examTitle}\n`;
    text += `Subject: ${params.subject} (Code: ${params.subjectCode})\n`;
    text += `Level: ${params.gradeLevel} | Language: ${params.language}\n`;
    text += `Duration: ${params.duration} | Max Marks: ${currentTotalMarks}\n`;
    text += `--------------------------------------------------\n\n`;

    questions.forEach((q, index) => {
      text += `Q${index + 1}. ${q.text} [${q.marks} Marks]\n`;
      if (q.type === 'mcq' && q.options) {
        q.options.forEach((opt, i) => {
          text += `   ${String.fromCharCode(65 + i)}. ${opt}\n`;
        });
      }
      if (q.type === 'descriptive' && q.subQuestions) {
        q.subQuestions.forEach((sub, i) => {
          text += `   ${sub}\n`;
        });
      }
      if (q.hasOrChoice && q.orText) {
        text += `\n   --- OR ---\n\n`;
        text += `   ${q.orText} [${q.marks} Marks]\n`;
        if (q.orType === 'mcq' && q.orOptions) {
          q.orOptions.forEach((opt, i) => {
            text += `      ${String.fromCharCode(65 + i)}. ${opt}\n`;
          });
        }
        if (q.orType === 'descriptive' && q.orSubQuestions) {
          q.orSubQuestions.forEach((sub, i) => {
            text += `      ${sub}\n`;
          });
        }
      }
      text += `\n`;
    });
    return text;
  };

  const generateDocxHTML = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>
        <div style="text-align: center; font-family: sans-serif;">
          <h3 style="color: #666; margin-bottom: 4px;">${params.examSubtitle}</h3>
          <h1 style="margin-top: 0;">${params.examTitle}</h1>
          <p>
            <strong>Subject:</strong> ${params.subject} (${params.subjectCode}) | 
            <strong>Level:</strong> ${params.gradeLevel} | 
            <strong>Language:</strong> ${params.language}
          </p>
          <p>
            <strong>Duration:</strong> ${params.duration} | 
            <strong>Max Marks:</strong> ${currentTotalMarks}
          </p>
          <hr/>
        </div>
        <div style="font-family: sans-serif; margin-top: 20px;">
          ${questions.map((q, i) => `
            <div style="margin-bottom: 20px;">
              <p><strong>Q${i + 1}.</strong> ${q.text} <span style="float:right;">[${q.marks} Marks]</span></p>
              ${q.type === 'mcq' && q.options ? `
                <ul style="list-style-type: upper-alpha;">
                  ${q.options.map((opt) => `<li>${opt}</li>`).join('')}
                </ul>
              ` : ''}
              ${q.type === 'descriptive' && q.subQuestions ? `
                <div style="margin-left: 20px;">
                  ${q.subQuestions.map((sub) => `<p>${sub}</p>`).join('')}
                </div>
              ` : ''}
              ${q.hasOrChoice && q.orText ? `
                <div style="text-align: center; font-weight: bold; margin: 10px 0;">-- OR --</div>
                <p>${q.orText}</p>
                ${q.orType === 'mcq' && q.orOptions ? `
                  <ul style="list-style-type: upper-alpha;">
                    ${q.orOptions.map((opt) => `<li>${opt}</li>`).join('')}
                  </ul>
                ` : ''}
                ${q.orType === 'descriptive' && q.orSubQuestions ? `
                  <div style="margin-left: 20px;">
                    ${q.orSubQuestions.map((sub) => `<p>${sub}</p>`).join('')}
                  </div>
                ` : ''}
              ` : ''}
            </div>
          `).join('')}
        </div>
      </body></html>
    `;
    return htmlContent;
  };

  const handleExportText = async () => {
    setShowExportMenu(false);
    const text = generatePlainText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    await saveFile(blob, `${params.subject}_Paper.txt`, 'text/plain', 'txt');
  };

  const handleExportWord = async () => {
    setShowExportMenu(false);
    const html = generateDocxHTML();
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    await saveFile(blob, `${params.subject}_Paper.doc`, 'application/msword', 'doc');
  };

  const handleExportImage = async () => {
    setShowExportMenu(false);
    const element = paperRef.current;
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      canvas.toBlob(async (blob) => {
        if (blob) {
          await saveFile(blob, `${params.subject}_Paper.png`, 'image/png', 'png');
        }
      }, 'image/png');
    } catch (err) {
      console.error('Error generating image', err);
      alert('Error generating image');
    }
  };

  const handlePrint = () => {
    setShowExportMenu(false);
    window.print();
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      {/* Header (Hidden in Print) */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-indigo-600">
            <Sparkles className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight">AI Exam Forge</h1>
          </div>
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'create' ? 'bg-indigo-50 text-indigo-700' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Configure</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('paper')}
              disabled={questions.length === 0}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${questions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''} ${activeTab === 'paper' ? 'bg-indigo-50 text-indigo-700' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Paper</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              disabled={questions.length === 0}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${questions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''} ${activeTab === 'analytics' ? 'bg-indigo-50 text-indigo-700' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </div>
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:m-0">
        
        {/* TAB: CREATE */}
        {activeTab === 'create' && (
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden print:hidden">
            <div className="p-6 border-b border-neutral-100 bg-neutral-50/50">
              <h2 className="text-lg font-semibold text-neutral-800">Exam Parameters</h2>
              <p className="text-sm text-neutral-500 mt-1">Configure the structure and difficulty of your question paper.</p>
            </div>
            
            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-sm font-medium text-neutral-700">Exam Title</label>
                  <input
                    type="text"
                    value={params.examTitle}
                    onChange={(e) => setParams({ ...params, examTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="e.g. Mid-Term Examination 2026"
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-sm font-medium text-neutral-700">Exam Subtitle / Institution Name</label>
                  <input
                    type="text"
                    value={params.examSubtitle}
                    onChange={(e) => setParams({ ...params, examSubtitle: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="e.g. Department of Computer Science, XYZ University"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Subject Name</label>
                  <input
                    type="text"
                    value={params.subject}
                    onChange={(e) => setParams({ ...params, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="e.g. Database Management Systems"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Subject Code</label>
                  <input
                    type="text"
                    value={params.subjectCode}
                    onChange={(e) => setParams({ ...params, subjectCode: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="e.g. CS201"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Duration</label>
                  <input
                    type="text"
                    value={params.duration}
                    onChange={(e) => setParams({ ...params, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="e.g. 3 Hours"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Language</label>
                  <select
                    value={params.language}
                    onChange={(e) => setParams({ ...params, language: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Bengali">Bengali</option>
                    <option value="Odia">Odia</option>
                    <option value="Spanish">Spanish</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-neutral-700">Grade / Level</label>
                  <input
                    type="text"
                    value={params.gradeLevel}
                    onChange={(e) => setParams({ ...params, gradeLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="e.g. Undergraduate Year 2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Topics Covered</label>
                <textarea
                  value={params.topics}
                  onChange={(e) => setParams({ ...params, topics: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="e.g. Normalization, SQL Joins, Indexing..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Question Formats</label>
                <input
                  type="text"
                  value={params.questionFormats}
                  onChange={(e) => setParams({ ...params, questionFormats: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="e.g. MCQs, Short Answers, Long Answers"
                />
              </div>

              <div className="col-span-1 md:col-span-2 pt-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.includeOrChoices}
                    onChange={(e) => setParams({ ...params, includeOrChoices: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-neutral-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-neutral-700">Include Internal Choices ("OR" questions for descriptive sections)</span>
                </label>
              </div>

              <div className="pt-4 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-800">Target Distribution</h3>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-neutral-500">Total Marks:</span>
                    <input
                      type="number"
                      value={params.totalMarks}
                      onChange={(e) => setParams({ ...params, totalMarks: parseInt(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min={10}
                      max={200}
                    />
                  </div>
                </div>
                
                <div className="space-y-2 mb-6">
                  <label className="text-sm font-medium text-neutral-700 flex justify-between">
                    <span>Marks Pattern <span className="text-xs text-neutral-400 font-normal">(Optional)</span></span>
                  </label>
                  <input
                    type="text"
                    value={params.marksPattern || ''}
                    onChange={(e) => setParams({ ...params, marksPattern: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="e.g. 10 questions of 1 mark, 5 questions of 4 marks, 2 questions of 10 marks"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-500 uppercase flex justify-between">
                      <span>Easy</span>
                      <span className="text-neutral-900">{params.difficultyLevels.easy}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={params.difficultyLevels.easy}
                      onChange={(e) => setParams({
                        ...params,
                        difficultyLevels: { ...params.difficultyLevels, easy: parseInt(e.target.value) }
                      })}
                      className="w-full accent-green-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-500 uppercase flex justify-between">
                      <span>Medium</span>
                      <span className="text-neutral-900">{params.difficultyLevels.medium}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={params.difficultyLevels.medium}
                      onChange={(e) => setParams({
                        ...params,
                        difficultyLevels: { ...params.difficultyLevels, medium: parseInt(e.target.value) }
                      })}
                      className="w-full accent-yellow-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-500 uppercase flex justify-between">
                      <span>Hard</span>
                      <span className="text-neutral-900">{params.difficultyLevels.hard}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={params.difficultyLevels.hard}
                      onChange={(e) => setParams({
                        ...params,
                        difficultyLevels: { ...params.difficultyLevels, hard: parseInt(e.target.value) }
                      })}
                      className="w-full accent-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 space-y-2">
                <label className="text-sm font-medium text-neutral-700 flex items-center justify-between">
                  <span>Anti-Repetition (Past Questions to Avoid)</span>
                  <span className="text-xs text-neutral-400 font-normal">Optional</span>
                </label>
                <textarea
                  value={params.pastQuestionsToAvoid}
                  onChange={(e) => setParams({ ...params, pastQuestionsToAvoid: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono bg-neutral-50"
                  placeholder="Paste questions you've used in recent exams to ensure AI generates novel variations."
                />
              </div>
            </div>
            
            <div className="p-6 bg-neutral-50/50 border-t border-neutral-200 flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-md font-medium text-sm transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Paper...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Question Paper</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB: PAPER */}
        {activeTab === 'paper' && questions.length > 0 && (
          <div className="max-w-4xl mx-auto print:max-w-full">
            <div className="flex justify-between items-center mb-6 print:hidden">
              <h2 className="text-2xl font-bold text-neutral-900">Generated Exam Paper</h2>
              <div className="flex items-center space-x-3">
                <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${currentTotalMarks === params.totalMarks ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                  Total Marks: {currentTotalMarks} / {params.totalMarks}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-neutral-200 z-50 py-1">
                      <button onClick={handlePrint} className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 flex items-center space-x-2">
                        <Printer className="w-4 h-4" /> <span>Print / PDF</span>
                      </button>
                      <button onClick={handleExportWord} className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 flex items-center space-x-2">
                        <File className="w-4 h-4" /> <span>Word Document (.doc)</span>
                      </button>
                      <button onClick={handleExportText} className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 flex items-center space-x-2">
                        <FileText className="w-4 h-4" /> <span>Plain Text (.txt)</span>
                      </button>
                      <button onClick={handleExportImage} className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 flex items-center space-x-2">
                        <ImageIcon className="w-4 h-4" /> <span>Image (.png)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* A4 Paper Styling for Print/Preview */}
            <div ref={paperRef} className="bg-white p-8 sm:p-12 shadow-sm border border-neutral-200 rounded-lg print:border-none print:shadow-none print:p-0">
              
              <div className="text-center mb-8 border-b-2 border-neutral-800 pb-6 print:pb-4 text-neutral-900">
                <h2 className="text-lg font-semibold uppercase tracking-widest text-neutral-600 mb-1">{params.examSubtitle}</h2>
                <h1 className="text-3xl font-bold uppercase tracking-wider mb-4">{params.examTitle}</h1>
                <div className="flex justify-between items-center text-sm font-medium text-neutral-800 border-t border-neutral-200 pt-3">
                  <div className="flex flex-col items-start space-y-1">
                    <span>Subject: {params.subject}</span>
                    <span className="text-neutral-500">Code: {params.subjectCode}</span>
                  </div>
                  <div className="flex flex-col items-center space-y-1">
                    <span>Level: {params.gradeLevel}</span>
                    <span className="text-neutral-500">Language: {params.language}</span>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span>Duration: {params.duration}</span>
                    <span>Max Marks: {currentTotalMarks}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-8 print:space-y-6">
                {questions.map((q, index) => (
                  <div key={q.id} className="relative group">
                    
                    {editingQuestionId === q.id && editingQuestionData ? (
                      <div className="bg-neutral-50 p-4 rounded-md border border-indigo-200 print:hidden shadow-sm">
                        <div className="space-y-4">
                          <textarea
                            value={editingQuestionData.text}
                            onChange={e => setEditingQuestionData({ ...editingQuestionData, text: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 text-sm h-24"
                            placeholder="Question text..."
                          />
                          <div className="flex space-x-4 flex-wrap gap-y-4">
                            <div className="space-y-1">
                              <label className="text-xs text-neutral-500">Question ID</label>
                              <input
                                type="text"
                                value={editingQuestionData.id || ''}
                                onChange={e => setEditingQuestionData({ ...editingQuestionData, id: e.target.value })}
                                className="w-24 px-2 py-1 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-neutral-500">Marks</label>
                              <input
                                type="number"
                                value={editingQuestionData.marks}
                                onChange={e => setEditingQuestionData({ ...editingQuestionData, marks: parseInt(e.target.value) || 0 })}
                                className="w-20 px-2 py-1 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-neutral-500">Question Type</label>
                              <select
                                value={editingQuestionData.type || 'descriptive'}
                                onChange={e => {
                                  const newType = e.target.value as 'descriptive' | 'mcq';
                                  setEditingQuestionData({
                                    ...editingQuestionData,
                                    type: newType,
                                    options: newType === 'mcq' ? (editingQuestionData.options?.length ? editingQuestionData.options : ['', '', '', '']) : undefined
                                  });
                                }}
                                className="px-2 py-1 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                              >
                                <option value="descriptive">Descriptive (Short/Long)</option>
                                <option value="mcq">Multiple Choice (MCQ)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-neutral-500">Difficulty</label>
                              <select
                                value={editingQuestionData.difficulty}
                                onChange={e => setEditingQuestionData({ ...editingQuestionData, difficulty: e.target.value as any })}
                                className="px-2 py-1 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                              >
                                <option>Easy</option>
                                <option>Medium</option>
                                <option>Hard</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-neutral-500">Bloom's Taxonomy</label>
                              <select
                                value={editingQuestionData.blooms_taxonomy}
                                onChange={e => setEditingQuestionData({ ...editingQuestionData, blooms_taxonomy: e.target.value as any })}
                                className="px-2 py-1 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                              >
                                <option>Remember</option>
                                <option>Understand</option>
                                <option>Apply</option>
                                <option>Analyze</option>
                                <option>Evaluate</option>
                                <option>Create</option>
                              </select>
                            </div>
                          </div>
                          
                          {editingQuestionData.type === 'mcq' && (
                            <div className="space-y-2 mt-4 bg-white p-3 rounded border border-neutral-200">
                              <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">MCQ Options</label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {editingQuestionData.options?.map((opt, i) => (
                                  <div key={i} className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-neutral-500 w-5">{String.fromCharCode(65 + i)}.</span>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const newOpts = [...(editingQuestionData.options || [])];
                                        newOpts[i] = e.target.value;
                                        setEditingQuestionData({ ...editingQuestionData, options: newOpts });
                                      }}
                                      className="flex-1 px-3 py-1.5 border border-neutral-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-4 pt-4 border-t border-neutral-200">
                            <label className="flex items-center space-x-2 mb-3 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={editingQuestionData.hasOrChoice || false}
                                onChange={e => setEditingQuestionData({...editingQuestionData, hasOrChoice: e.target.checked})}
                                className="w-4 h-4 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500"
                              />
                              <span className="text-sm font-medium text-neutral-700">Include an "OR" Alternative Question</span>
                            </label>

                            {editingQuestionData.hasOrChoice && (
                              <div className="mt-3 space-y-4 pl-6 border-l-2 border-indigo-100">
                                <div className="space-y-1">
                                  <label className="text-xs text-neutral-500">Alternative Question Type</label>
                                  <select
                                    value={editingQuestionData.orType || 'descriptive'}
                                    onChange={e => {
                                      const newType = e.target.value as 'descriptive' | 'mcq';
                                      setEditingQuestionData({
                                        ...editingQuestionData,
                                        orType: newType,
                                        orOptions: newType === 'mcq' ? (editingQuestionData.orOptions?.length ? editingQuestionData.orOptions : ['', '', '', '']) : undefined
                                      });
                                    }}
                                    className="px-2 py-1 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                                  >
                                    <option value="descriptive">Descriptive (Short/Long)</option>
                                    <option value="mcq">Multiple Choice (MCQ)</option>
                                  </select>
                                </div>
                                <textarea
                                  value={editingQuestionData.orText || ''}
                                  onChange={e => setEditingQuestionData({ ...editingQuestionData, orText: e.target.value })}
                                  className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 text-sm h-24"
                                  placeholder="Alternative Question text..."
                                />
                                {editingQuestionData.orType === 'mcq' && (
                                  <div className="space-y-2 bg-white p-3 rounded border border-neutral-200">
                                    <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">Alternative MCQ Options</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {editingQuestionData.orOptions?.map((opt, i) => (
                                        <div key={i} className="flex items-center space-x-2">
                                          <span className="text-sm font-medium text-neutral-500 w-5">{String.fromCharCode(65 + i)}.</span>
                                          <input
                                            type="text"
                                            value={opt || ''}
                                            onChange={(e) => {
                                              const newOpts = [...(editingQuestionData.orOptions || [])];
                                              newOpts[i] = e.target.value;
                                              setEditingQuestionData({ ...editingQuestionData, orOptions: newOpts });
                                            }}
                                            className="flex-1 px-3 py-1.5 border border-neutral-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end space-x-2 pt-2">
                            <button onClick={handleCancelEdit} className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200 rounded flex items-center">
                              <X className="w-4 h-4 mr-1" /> Cancel
                            </button>
                            <button onClick={handleSaveEdit} className="px-3 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded flex items-center">
                              <Save className="w-4 h-4 mr-1" /> Save
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start">
                          <span className="font-semibold text-neutral-900 w-8">{index + 1}.</span>
                          <div className="flex-1">
                            <p className="text-neutral-900 text-base leading-relaxed whitespace-pre-wrap">{q.text}</p>
                            
                            {q.type === 'descriptive' && q.subQuestions && q.subQuestions.length > 0 && (
                              <div className="mt-2 space-y-2 pl-2">
                                {q.subQuestions.map((sub, i) => (
                                  <div key={i} className="flex items-start text-sm">
                                    <span className="text-neutral-800 whitespace-pre-wrap">{sub}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {q.type === 'mcq' && q.options && (
                              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                                {q.options.map((opt, i) => (
                                  <div key={i} className="flex items-start text-sm">
                                    <span className="font-semibold text-neutral-800 mr-2">{String.fromCharCode(65 + i)}.</span>
                                    <span className="text-neutral-800">{opt}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {q.hasOrChoice && q.orText && (
                              <div className="mt-6 pt-5 border-t border-dashed border-neutral-300">
                                <div className="text-center font-bold text-neutral-500 mb-4 uppercase text-sm tracking-widest leading-none">OR</div>
                                <p className="text-neutral-900 text-base leading-relaxed whitespace-pre-wrap">{q.orText}</p>
                                
                                {q.orType === 'descriptive' && q.orSubQuestions && q.orSubQuestions.length > 0 && (
                                  <div className="mt-2 space-y-2 pl-2">
                                    {q.orSubQuestions.map((sub, i) => (
                                      <div key={i} className="flex items-start text-sm">
                                        <span className="text-neutral-800 whitespace-pre-wrap">{sub}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {q.orType === 'mcq' && q.orOptions && (
                                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                                    {q.orOptions.map((opt, i) => (
                                      <div key={i} className="flex items-start text-sm">
                                        <span className="font-semibold text-neutral-800 mr-2">{String.fromCharCode(65 + i)}.</span>
                                        <span className="text-neutral-800">{opt}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <span className="text-sm font-medium text-neutral-600">[{q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}]</span>
                          </div>
                        </div>

                        {/* Editor Metadata & Actions - Hidden during Print! */}
                        <div className="ml-8 mt-3 hidden group-hover:flex print:!hidden items-center flex-wrap gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium border ${
                            q.difficulty === 'Easy' ? 'bg-green-50 text-green-700 border-green-200' :
                            q.difficulty === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {q.difficulty}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                            Bloom's: {q.blooms_taxonomy}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200 font-medium font-mono">
                            ID: {q.id}
                          </span>
                          
                          <div className="flex-1 min-w-[20px]" />
                          
                          <button
                            onClick={() => handleEditClick(q)}
                            className="flex items-center space-x-1 text-xs text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1.5 rounded transition-colors font-medium"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded transition-colors font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                          
                          <button
                            onClick={() => handleRegenerateQuestion(q)}
                            disabled={isRegeneratingId !== null}
                            className="flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded transition-colors disabled:opacity-50 font-medium"
                          >
                            {isRegeneratingId === q.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            <span>Regenerate Component</span>
                          </button>
                        </div>
                      </>
                    )}

                  </div>
                ))}
              </div>
              
              <div className="mt-8 flex justify-center print:hidden">
                <button
                  onClick={handleAddQuestion}
                  className="flex items-center space-x-2 px-4 py-2 border-2 border-dashed border-neutral-300 text-neutral-600 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-colors bg-neutral-50/50 hover:bg-indigo-50/50 w-full justify-center font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Question Manually</span>
                </button>
              </div>
              
              <div className="mt-12 pt-8 border-t border-neutral-300 text-center text-xs text-neutral-400 print:block">
                *** END OF PAPER ***
              </div>
            </div>
          </div>
        )}

        {/* TAB: ANALYTICS */}
        {activeTab === 'analytics' && questions.length > 0 && (
          <div className="max-w-5xl mx-auto print:hidden space-y-6">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">Paper Analytics</h2>
                <p className="text-neutral-500 text-sm mt-1">Difficulty and cognitive level distribution analysis.</p>
              </div>
              <button
                onClick={() => setActiveTab('paper')}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center group"
              >
                Back to Paper <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Difficulty Breakdown */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
                <h3 className="text-lg font-semibold text-neutral-800 mb-6 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-neutral-400" />
                  Difficulty Distribution (Marks)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={difficultyData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {difficultyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [`${value} Marks`, 'Total']} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bloom's Taxonomy Breakdown */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
                <h3 className="text-lg font-semibold text-neutral-800 mb-6 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-neutral-400" />
                  Bloom's Taxonomy Breakdown
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={bloomsData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                      <RechartsTooltip cursor={{fill: '#f5f5f5'}} formatter={(value) => [`${value} Marks`, 'Marks']} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                        {bloomsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={BLOOMS_COLORS[entry.name as keyof typeof BLOOMS_COLORS]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;

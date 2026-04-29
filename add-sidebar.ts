import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the <main ...> tag
content = content.replace(
  /<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:m-0">/,
  `<div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8 print:p-0 print:m-0 print:block">
        
        {/* Sidebar */}
        <aside className="w-full lg:w-72 flex-shrink-0 space-y-6 print:hidden">
          {/* History */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center space-x-2 bg-neutral-50/50">
              <History className="w-4 h-4 text-neutral-600" />
              <h3 className="font-semibold text-neutral-800">History Papers</h3>
            </div>
            <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
              {history.length === 0 && <p className="p-3 text-sm text-neutral-500 text-center">No history yet</p>}
              {history.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setParams(item.params);
                    setQuestions(item.questions);
                    setActiveTab('paper');
                    setSelectedTags([]);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-neutral-100 transition-colors"
                >
                  <p className="text-sm font-medium text-neutral-800 truncate">{item.params.examTitle}</p>
                  <p className="text-xs text-neutral-500">{new Date(item.createdAt).toLocaleDateString()} • {item.questions.length} Qs</p>
                </button>
              ))}
            </div>
          </div>

          {/* Recommended Questions */}
          {activeTab === 'paper' && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="p-4 border-b border-neutral-100 flex items-center space-x-2 bg-[#fdfaf3]">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-neutral-800">Recommended Additions</h3>
              </div>
              <div className="p-4 space-y-4">
                {isFetchingRecommended ? (
                  <div className="flex flex-col items-center justify-center py-6 space-y-3">
                    <Loader2 className="w-6 h-6 animate-spin text-[#b48b59]" />
                    <p className="text-xs text-neutral-500">Finding good questions...</p>
                  </div>
                ) : recommendedQuestions.length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center">No recommendations yet.</p>
                ) : (
                  recommendedQuestions.map((q, idx) => (
                    <div key={idx} className="border border-neutral-100 bg-neutral-50 p-3 rounded-lg flex flex-col space-y-2">
                       <p className="text-sm text-neutral-800 line-clamp-3">{q.text}</p>
                       <div className="flex justify-between items-center">
                         <span className="text-xs text-neutral-500">{q.marks} Marks • {q.difficulty}</span>
                         <button 
                           onClick={() => {
                             const newQ = {...q, id: Math.random().toString(36).substring(7)};
                             setQuestions(current => [...current, newQ]);
                             setRecommendedQuestions(current => current.filter((_, i) => i !== idx));
                           }}
                           className="text-xs font-medium text-[#b48b59] hover:text-[#a67c4e] flex items-center space-x-1"
                         >
                           <Plus className="w-3 h-3" />
                           <span>Add</span>
                         </button>
                       </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 min-w-0">`
);

// We need to replace the closing `</main>` and closing wrapper `</div>` where appropriate
content = content.replace(
  /<\/main>/,
  `</main>\n      </div>`
);

fs.writeFileSync('src/App.tsx', content);


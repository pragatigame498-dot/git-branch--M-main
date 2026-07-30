import React, { memo } from 'react';
import { FileText, Code2, Briefcase, Upload } from 'lucide-react';
import robotImg from '../assets/robot.png';

// ==============================================================================
// PERFORMANCE OPTIMIZATION:
// Memoized SuggestionCards component prevents re-rendering welcome cards.
// ==============================================================================

function SuggestionCards({ onSelectCard, onOpenUploadModal }) {
  const suggestions = [
    {
      title: "Professional Summary",
      desc: "Summarize candidate experience & BCA background",
      icon: <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      prompt: "What is the professional summary of Pragati Game?"
    },
    {
      title: "Technical Skills",
      desc: "Languages, Python, React.js, FastAPI, & SQL",
      icon: <Code2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      prompt: "List all technical skills, languages, and tools mentioned in the document."
    },
    {
      title: "Projects & Experience",
      desc: "Smart Ration, To-Do List, & Poultry AI",
      icon: <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />,
      prompt: "Detail the key projects listed in the candidate's resume."
    }
  ];

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[55vh] text-center px-4 animate-in fade-in duration-500">
      {/* Clean 3D Thinking Robot Hero Image */}
      <div className="relative mb-3 group cursor-pointer" onClick={onOpenUploadModal}>
        <div className="w-36 h-40 flex items-center justify-center animate-float">
          <img 
            src={robotImg} 
            alt="3D Thinking Robot" 
            className="w-full h-full object-contain filter drop-shadow-2xl group-hover:scale-110 transition-transform duration-300" 
          />
        </div>
      </div>

      <h2 className="text-2xl font-extrabold text-[#111827] dark:text-white tracking-tight transition-colors duration-300">
        ASA Bot RAG Intelligence
      </h2>
      <p className="text-sm text-purple-600 dark:text-purple-400 max-w-md mt-1 mb-8 font-semibold transition-colors duration-300">
        प्रश्न किंवा वाक्य टाइप करा किंवा खालीलपैकी पर्याय निवडा.
      </p>

      {/* Suggestion Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
        {suggestions.map((item, idx) => (
          <div
            key={idx}
            onClick={() => onSelectCard(item.prompt)}
            className="group p-4 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/80 hover:border-[#8E72FF] dark:hover:border-purple-500 rounded-3xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 flex flex-col justify-between"
          >
            <div className="p-2.5 w-fit rounded-2xl bg-purple-100/80 dark:bg-purple-950/60 group-hover:scale-105 transition-transform">
              {item.icon}
            </div>

            <div className="mt-4">
              <h3 className="font-bold text-[#111827] dark:text-white text-xs group-hover:text-[#8E72FF] dark:group-hover:text-purple-300 transition-colors">
                {item.title}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed font-medium">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Upload CTA */}
      <div className="mt-8">
        <button
          onClick={onOpenUploadModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#1E293B] hover:bg-slate-100 dark:hover:bg-slate-700 text-[#111827] dark:text-white text-xs font-bold rounded-full transition-all border border-slate-200 dark:border-slate-700 shadow-md cursor-pointer"
        >
          <Upload className="w-4 h-4 text-[#8E72FF] dark:text-purple-400" />
          <span>Upload PDF Document</span>
        </button>
      </div>
    </div>
  );
}

export default memo(SuggestionCards);

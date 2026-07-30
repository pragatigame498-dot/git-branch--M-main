import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Copy, Check, RefreshCw } from 'lucide-react';
import robotImg from '../assets/robot.png';

// ==============================================================================
// PERFORMANCE OPTIMIZATION:
// Memoized ChatMessage prevents re-rendering previous chat history items
// whenever new messages are typed or streamed into the UI.
// ==============================================================================

function ChatMessage({ message, onCopySuccess, onRegenerate }) {
  const isUser = message.sender === 'user';
  const [copiedCodeIndex, setCopiedCodeIndex] = useState(null);
  const [isAnswerCopied, setIsAnswerCopied] = useState(false);

  const handleCopyAnswer = () => {
    navigator.clipboard.writeText(message.text);
    setIsAnswerCopied(true);
    if (onCopySuccess) onCopySuccess("Answer copied to clipboard!");
    setTimeout(() => setIsAnswerCopied(false), 2000);
  };

  const handleCopyCode = (codeText, idx) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIndex(idx);
    if (onCopySuccess) onCopySuccess("Code snippet copied!");
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  return (
    <div className={`flex gap-3 text-sm my-3.5 transition-all ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Clean 3D Robot Avatar */}
      {!isUser && (
        <div className="w-12 h-14 shrink-0 animate-float flex items-center justify-center mt-0.5">
          <img 
            src={robotImg} 
            alt="3D Robot Avatar" 
            className="w-full h-full object-contain filter drop-shadow-md" 
          />
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={`group relative max-w-[82%] sm:max-w-[76%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`
          px-5 py-3.5 rounded-2xl transition-colors duration-300 font-medium leading-relaxed
          ${isUser 
            ? 'bg-[#8E72FF] text-white rounded-tr-xs shadow-md shadow-[#8E72FF]/20' 
            : 'bg-white text-[#111827] border border-slate-200 dark:bg-[#1E293B] dark:text-white dark:border-slate-700/80 rounded-tl-xs shadow-sm'
          }
        `}>
          {isUser ? (
            <p className="whitespace-pre-wrap text-white font-medium text-sm">{message.text}</p>
          ) : (
            <div className="prose-custom">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    const codeIdx = Math.random();

                    if (!inline && match) {
                      return (
                        <div className="relative my-2.5 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 text-slate-100 shadow-md">
                          <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-950 text-[11px] text-purple-300 font-mono border-b border-slate-800">
                            <span>{match[1]}</span>
                            <button
                              onClick={() => handleCopyCode(codeString, codeIdx)}
                              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedCodeIndex === codeIdx ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="p-3.5 text-xs overflow-x-auto font-mono leading-relaxed">
                            <code>{codeString}</code>
                          </pre>
                        </div>
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Action Buttons for AI Response */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity px-1">
            <button
              onClick={handleCopyAnswer}
              title="Copy Answer"
              className="flex items-center gap-1 text-[11px] font-semibold text-[#8E72FF] dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
            >
              {isAnswerCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {onRegenerate && (
              <button
                onClick={() => onRegenerate(message.id)}
                title="Regenerate Answer"
                className="flex items-center gap-1 text-[11px] font-semibold text-[#8E72FF] dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-500/20 border-2 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-sm mt-0.5 overflow-hidden transition-colors duration-300">
          <User className="w-6 h-6 text-amber-700 dark:text-amber-300" />
        </div>
      )}
    </div>
  );
}

export default memo(ChatMessage);

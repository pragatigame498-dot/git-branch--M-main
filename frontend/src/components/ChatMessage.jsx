import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { User, Copy, Check, RefreshCw } from 'lucide-react';
import robotImg from '../assets/robot.png';

// ==============================================================================
// PERFORMANCE & ANIMATION OPTIMIZATION:
// Framer-motion entrance animations with memoization for zero lag.
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
    <motion.div 
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex gap-3 text-sm my-3.5 transition-all ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Clean 3D Robot Avatar with Subtle Floating Animation */}
      {!isUser && (
        <motion.div 
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="w-12 h-14 shrink-0 flex items-center justify-center mt-0.5"
        >
          <img 
            src={robotImg} 
            alt="3D Robot Avatar" 
            className="w-full h-full object-contain filter drop-shadow-md" 
          />
        </motion.div>
      )}

      {/* Message Bubble Container */}
      <div className={`group relative max-w-[82%] sm:max-w-[76%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`
          px-5 py-3.5 rounded-2xl transition-all duration-300 font-medium leading-relaxed
          ${isUser 
            ? 'bg-[#8E72FF] text-white rounded-tr-xs shadow-md shadow-[#8E72FF]/20 hover:shadow-lg hover:shadow-[#8E72FF]/30' 
            : 'bg-white text-[#111827] border border-slate-200 dark:bg-[#1E293B] dark:text-white dark:border-slate-700/80 rounded-tl-xs shadow-sm hover:border-purple-300 dark:hover:border-purple-500/50'
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
                    const codeText = String(children).replace(/\n$/, '');
                    const idx = props.index || Math.random();

                    return !inline && match ? (
                      <div className="relative my-3 rounded-xl overflow-hidden border border-slate-700/60 bg-[#0F172A]">
                        <div className="flex items-center justify-between px-4 py-1.5 bg-[#1E293B] border-b border-slate-700/60 text-slate-400 text-xs font-mono">
                          <span>{match[1]}</span>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCopyCode(codeText, idx)}
                            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                          >
                            {copiedCodeIndex === idx ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </motion.button>
                        </div>
                        <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed">
                          <code>{children}</code>
                        </pre>
                      </div>
                    ) : (
                      <code className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-mono">
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

        {/* Action Bar for Bot Messages */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <motion.button 
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleCopyAnswer}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#8E72FF] transition-colors cursor-pointer"
              title="Copy answer"
            >
              {isAnswerCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 text-[11px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </motion.button>

            {onRegenerate && (
              <motion.button 
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={onRegenerate}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#8E72FF] transition-colors cursor-pointer"
                title="Regenerate response"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-[11px]">Retry</span>
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
        >
          <User className="w-4 h-4" />
        </motion.div>
      )}
    </motion.div>
  );
}

export default memo(ChatMessage);

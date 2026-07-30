import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { User, Copy, Check, RefreshCw } from 'lucide-react';
import AnimatedRobot from './AnimatedRobot';

// ==============================================================================
// ALIVE ANIMATED CHAT MESSAGE COMPONENT
// Features spring entrance from left/right, scale bounce, hover glow, & animated copy.
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
      initial={{ 
        opacity: 0, 
        x: isUser ? 25 : -25, 
        scale: isUser ? 0.96 : 0.94 
      }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 22 }}
      className={`flex gap-3 text-sm my-3.5 transition-all ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Animated AI Robot Avatar */}
      {!isUser && (
        <div className="w-10 h-12 shrink-0 flex items-center justify-center mt-0.5">
          <AnimatedRobot size="sm" />
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={`group relative max-w-[88%] sm:max-w-[82%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`
          px-5 py-4 rounded-[22px] transition-all duration-300 font-normal leading-relaxed text-base
          ${isUser 
            ? 'bg-[#D97706] text-white rounded-tr-xs shadow-md shadow-amber-600/20 hover:shadow-lg hover:shadow-amber-600/30 font-medium' 
            : 'bg-[#F4F1EA] text-[#2D2926] border border-amber-900/10 dark:bg-[#242421] dark:text-[#ECEAE5] dark:border-white/10 rounded-tl-xs shadow-xs hover:shadow-md'
          }
        `}>
          {isUser ? (
            <p className="whitespace-pre-wrap text-white font-medium text-base leading-relaxed">{message.text}</p>
          ) : (
            <div className="prose-custom text-base leading-relaxed">
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
                            whileHover={{ scale: 1.12 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => handleCopyCode(codeText, idx)}
                            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                          >
                            {copiedCodeIndex === idx ? (
                              <motion.div 
                                initial={{ scale: 0 }} 
                                animate={{ scale: 1 }} 
                                transition={{ type: "spring", stiffness: 400 }}
                                className="flex items-center gap-1 text-emerald-400"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Copied</span>
                              </motion.div>
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
            {/* Copy Button */}
            <motion.button 
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleCopyAnswer}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#8E72FF] transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Copy answer"
            >
              {isAnswerCopied ? (
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ type: "spring", stiffness: 400 }}
                  className="flex items-center gap-1 text-emerald-500"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Copied</span>
                </motion.div>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </motion.button>

            {/* Regenerate Button */}
            {onRegenerate && (
              <motion.button 
                whileHover={{ scale: 1.12, rotate: 180 }}
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.3 }}
                onClick={onRegenerate}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#8E72FF] hover:shadow-[0_0_12px_rgba(142,114,255,0.4)] transition-all cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
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
          whileHover={{ scale: 1.1 }}
          className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
        >
          <User className="w-4 h-4" />
        </motion.div>
      )}
    </motion.div>
  );
}

export default memo(ChatMessage);

import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion } from 'framer-motion';
import { User, Copy, Check, RefreshCw } from 'lucide-react';
import AnimatedRobot from './AnimatedRobot';

// ==============================================================================
// PROFESSIONAL VS CODE / GITHUB DARK STYLE CODE BLOCK
// Features language badge, copy code button with check mark, syntax highlighting,
// optional line numbers, rounded corners, & comfortable scrolling.
// ==============================================================================

function CodeBlock({ className, children, onCopySuccess }) {
  const match = /language-(\w+)/.exec(className || '');
  const rawLang = match ? match[1] : '';
  const displayLang = rawLang ? rawLang.toUpperCase() : 'CODE';
  const codeText = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    if (onCopySuccess) onCopySuccess("Code snippet copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const isMultiLine = codeText.includes('\n');

  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-slate-700/60 dark:border-slate-800 bg-[#1E1E1E] shadow-xl text-left">
      {/* VS Code Dark Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-slate-800 text-slate-300 text-xs font-mono select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#8E72FF] shadow-xs inline-block" />
          <span className="font-bold text-[11px] tracking-wider text-slate-200">{displayLang}</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs font-sans font-medium"
        >
          {copied ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 text-emerald-400 font-bold">
              <Check className="w-3.5 h-3.5" />
              <span>Copied!</span>
            </motion.div>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Syntax Highlighting Container */}
      <SyntaxHighlighter
        language={rawLang || 'text'}
        style={vscDarkPlus}
        showLineNumbers={isMultiLine}
        customStyle={{
          margin: 0,
          padding: '1.15rem 1rem',
          backgroundColor: '#1E1E1E',
          fontSize: '0.85rem',
          lineHeight: '1.6',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'inherit',
          }
        }}
      >
        {codeText}
      </SyntaxHighlighter>
    </div>
  );
}

// ==============================================================================
// ALIVE ANIMATED CHAT MESSAGE COMPONENT WITH FULL MARKDOWN & CODE HIGHLIGHTING
// ==============================================================================

function ChatMessage({ message, onCopySuccess, onRegenerate }) {
  const isUser = message.sender === 'user';
  const [isAnswerCopied, setIsAnswerCopied] = useState(false);

  const handleCopyAnswer = () => {
    navigator.clipboard.writeText(message.text);
    setIsAnswerCopied(true);
    if (onCopySuccess) onCopySuccess("Answer copied to clipboard!");
    setTimeout(() => setIsAnswerCopied(false), 2000);
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
      className={`flex gap-3 text-sm my-4 transition-all ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Animated AI Robot Avatar */}
      {!isUser && (
        <div className="w-10 h-12 shrink-0 flex items-center justify-center mt-0.5">
          <AnimatedRobot size="sm" />
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={`group relative max-w-[88%] sm:max-w-[84%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`
          px-5 py-4 rounded-[22px] transition-all duration-300 font-normal leading-relaxed text-base
          ${isUser 
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 font-medium' 
            : 'bg-white/95 text-slate-800 border border-slate-200/90 dark:bg-[#1E293B] dark:text-slate-100 dark:border-slate-700/80 rounded-tl-xs shadow-xs hover:shadow-md'
          }
        `}>
          {isUser ? (
            <p className="whitespace-pre-wrap text-white font-medium text-base leading-relaxed">{message.text}</p>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="prose-custom text-base leading-relaxed text-left"
            >
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h1({ children }) {
                    return (
                      <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-4 mb-3 pb-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                        <span className="w-1.5 h-5 rounded-full bg-[#8E72FF] inline-block shrink-0" />
                        <span>{children}</span>
                      </h1>
                    );
                  },
                  h2({ children }) {
                    return (
                      <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100 mt-4 mb-2 flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full bg-purple-500 inline-block shrink-0" />
                        <span>{children}</span>
                      </h2>
                    );
                  },
                  h3({ children }) {
                    return (
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1.5">
                        {children}
                      </h3>
                    );
                  },
                  p({ children }) {
                    return <p className="my-2.5 leading-relaxed text-slate-800 dark:text-slate-200">{children}</p>;
                  },
                  hr() {
                    return <hr className="my-5 border-t border-slate-200 dark:border-slate-800/80" />;
                  },
                  ul({ children }) {
                    return <ul className="my-3 pl-5 space-y-1.5 list-disc text-slate-800 dark:text-slate-200">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="my-3 pl-5 space-y-1.5 list-decimal text-slate-800 dark:text-slate-200">{children}</ol>;
                  },
                  li({ children }) {
                    return <li className="pl-1 text-slate-800 dark:text-slate-200 leading-relaxed">{children}</li>;
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote className="my-3 pl-4 py-2 border-l-4 border-purple-500 bg-purple-500/10 dark:bg-purple-500/15 rounded-r-xl italic text-slate-700 dark:text-slate-300">
                        {children}
                      </blockquote>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <table className="w-full text-left text-sm border-collapse">{children}</table>
                      </div>
                    );
                  },
                  thead({ children }) {
                    return <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-semibold border-b border-slate-200 dark:border-slate-700">{children}</thead>;
                  },
                  tbody({ children }) {
                    return <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">{children}</tbody>;
                  },
                  tr({ children }) {
                    return <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 even:bg-slate-50/50 dark:even:bg-slate-900/30 transition-colors">{children}</tr>;
                  },
                  th({ children }) {
                    return <th className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">{children}</th>;
                  },
                  td({ children }) {
                    return <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{children}</td>;
                  },
                  a({ href, children }) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 font-medium underline underline-offset-2 hover:opacity-80 transition-opacity">
                        {children}
                      </a>
                    );
                  },
                  code({ node, inline, className, children, ...props }) {
                    const isInline = inline || !className;
                    if (isInline) {
                      return (
                        <code className="px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-mono text-xs font-medium border border-purple-200/60 dark:border-purple-800/60">
                          {children}
                        </code>
                      );
                    }
                    return (
                      <CodeBlock className={className} onCopySuccess={onCopySuccess}>
                        {children}
                      </CodeBlock>
                    );
                  }
                }}
              >
                {message.text}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-2 h-4.5 ml-1 bg-purple-500 dark:bg-purple-400 animate-pulse rounded-2xs align-middle" />
              )}
            </motion.div>
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

            {/* Regenerate / Retry Button */}
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
          className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-600 dark:bg-indigo-950/80 dark:border-indigo-800 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
        >
          <User className="w-4 h-4" />
        </motion.div>
      )}
    </motion.div>
  );
}

export default memo(ChatMessage);

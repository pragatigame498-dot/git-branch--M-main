import React, { useState, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, Loader2, Sparkles, CornerDownLeft } from 'lucide-react';

// ==============================================================================
// 2026 NEXT-GEN AI CHAT INPUT (Linear.app / v0 / Claude 3.5 Inspired)
// Features floating border glow, active text pulse, & shortcut indicators.
// ==============================================================================

function ChatInput({ onSendMessage, isLoading, onOpenUploadModal }) {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!text.trim() || isLoading) return;
    onSendMessage(text);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const hasContent = text.trim().length > 0;

  return (
    <div className="px-5 py-4 bg-transparent shrink-0">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto relative">
        <motion.div 
          animate={{ 
            boxShadow: isFocused 
              ? "0 0 25px rgba(142, 114, 255, 0.3), 0 0 10px rgba(0, 242, 254, 0.2)" 
              : "0 4px 15px rgba(0, 0, 0, 0.05)"
          }}
          transition={{ duration: 0.3 }}
          className={`
            relative flex items-center bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl
            border transition-all duration-300 rounded-[24px] p-2 pl-4 shadow-xl
            ${isFocused 
              ? 'border-[#8E72FF] dark:border-purple-500/80 bg-white dark:bg-[#1E293B]' 
              : 'border-slate-200/80 dark:border-slate-700/80'
            }
          `}
        >
          
          {/* AI Sparkle Icon Indicator */}
          <div className="p-1.5 text-purple-500 dark:text-purple-400 shrink-0">
            <Sparkles className="w-4.5 h-4.5 animate-pulse" />
          </div>

          {/* Attachment Button */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: -15 }}
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={onOpenUploadModal}
            title="Upload PDF Document"
            className="p-1.5 text-slate-400 dark:text-slate-400 hover:text-[#8E72FF] dark:hover:text-purple-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0 cursor-pointer"
          >
            <Paperclip className="w-4.5 h-4.5" />
          </motion.button>

          {/* Input Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask anything about your PDF document..."
            className="flex-1 bg-transparent border-none outline-none text-[#1C1C1E] dark:text-white placeholder-slate-400 text-xs sm:text-sm px-3 py-1.5 resize-none max-h-30 leading-relaxed font-medium transition-colors"
          />

          {/* Linear-Style Shortcut Pill (Visible when text present on Desktop) */}
          {hasContent && (
            <span className="hidden md:flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-md mr-2 shrink-0">
              <span>Enter</span>
              <CornerDownLeft className="w-3 h-3" />
            </span>
          )}

          {/* Submit Button */}
          <motion.button
            whileHover={hasContent && !isLoading ? { scale: 1.08 } : {}}
            whileTap={hasContent && !isLoading ? { scale: 0.92 } : {}}
            animate={hasContent && !isLoading ? { scale: [1, 1.05, 1] } : {}}
            transition={hasContent && !isLoading ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
            type="submit"
            disabled={!hasContent || isLoading}
            className={`
              w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 cursor-pointer shadow-md
              ${hasContent && !isLoading
                ? 'bg-gradient-to-r from-[#8E72FF] to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-purple-500/30' 
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
              }
            `}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 ml-0.5" />
            )}
          </motion.button>

        </motion.div>
      </form>
    </div>
  );
}

export default memo(ChatInput);

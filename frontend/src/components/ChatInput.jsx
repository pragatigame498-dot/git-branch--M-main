import React, { useState, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, Loader2 } from 'lucide-react';

// ==============================================================================
// PREMIUM ANIMATED CHAT INPUT
// Features floating border glow, send button pulse when active, & micro-interactions.
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
              ? "0 0 20px rgba(142, 114, 255, 0.25)" 
              : "0 2px 10px rgba(0, 0, 0, 0.05)"
          }}
          transition={{ duration: 0.3 }}
          className={`
            relative flex items-center bg-[#F8FAFC] dark:bg-[#0F172A] 
            border transition-all duration-300 rounded-full p-1.5 pl-4
            ${isFocused 
              ? 'border-[#8E72FF] dark:border-purple-500 bg-white dark:bg-[#1E293B]' 
              : 'border-slate-200 dark:border-slate-700'
            }
          `}
        >
          
          {/* Attachment Button */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: -15 }}
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={onOpenUploadModal}
            title="Upload PDF Document"
            className="p-2 text-slate-400 dark:text-slate-400 hover:text-[#8E72FF] dark:hover:text-purple-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0 cursor-pointer"
          >
            <Paperclip className="w-5 h-5" />
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
            className="flex-1 bg-transparent border-none outline-none text-[#111827] dark:text-white placeholder-slate-400 text-sm px-3 py-1.5 resize-none max-h-30 leading-relaxed font-medium transition-colors"
          />

          {/* Submit Button */}
          <motion.button
            whileHover={hasContent && !isLoading ? { scale: 1.08 } : {}}
            whileTap={hasContent && !isLoading ? { scale: 0.92 } : {}}
            animate={hasContent && !isLoading ? { scale: [1, 1.05, 1] } : {}}
            transition={hasContent && !isLoading ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
            type="submit"
            disabled={!hasContent || isLoading}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 cursor-pointer shadow-md
              ${hasContent && !isLoading
                ? 'bg-[#8E72FF] hover:bg-[#7c5efc] text-white shadow-[#8E72FF]/40' 
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
              }
            `}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-4.5 h-4.5 ml-0.5" />
            )}
          </motion.button>

        </motion.div>
      </form>
    </div>
  );
}

export default memo(ChatInput);

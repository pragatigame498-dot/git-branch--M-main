import React, { useState, useRef, memo } from 'react';
import { Send, Paperclip, Loader2 } from 'lucide-react';

// ==============================================================================
// PERFORMANCE OPTIMIZATION:
// Memoized ChatInput prevents input element re-renders when parent state updates.
// ==============================================================================

function ChatInput({ onSendMessage, isLoading, onOpenUploadModal }) {
  const [text, setText] = useState('');
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

  return (
    <div className="px-5 py-4 bg-transparent shrink-0">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto relative">
        <div className="relative flex items-center bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-full shadow-inner focus-within:border-[#8E72FF] dark:focus-within:border-purple-500 transition-colors duration-300 p-1.5 pl-4">
          
          {/* Attachment Button */}
          <button
            type="button"
            onClick={onOpenUploadModal}
            title="Upload PDF Document"
            className="p-2 text-slate-400 dark:text-slate-400 hover:text-[#8E72FF] dark:hover:text-purple-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0 cursor-pointer"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Input Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your PDF document..."
            className="flex-1 bg-transparent border-0 px-3 py-2 text-sm text-[#111827] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-0 resize-none max-h-32 font-medium"
          />

          {/* Circular Purple Send Button */}
          <button
            type="submit"
            disabled={!text.trim() || isLoading}
            className={`
              w-11 h-11 rounded-full text-white font-medium flex items-center justify-center transition-all shrink-0 shadow-md
              ${text.trim() && !isLoading
                ? 'bg-[#8E72FF] hover:bg-[#7B5CFE] active:scale-95 shadow-[#8E72FF]/30 cursor-pointer'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed scale-95'
              }
            `}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Send className="w-5 h-5 fill-white text-white translate-x-0.5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default memo(ChatInput);

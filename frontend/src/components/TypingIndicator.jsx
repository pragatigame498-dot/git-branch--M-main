import React, { memo } from 'react';
import { motion } from 'framer-motion';
import robotImg from '../assets/robot.png';

// ==============================================================================
// PERFORMANCE OPTIMIZATION:
// Memoized TypingIndicator component renders instantly without layout shifts.
// ==============================================================================

function TypingIndicator() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center justify-start gap-3 my-4 w-full"
    >
      {/* Clean 3D Thinking Robot with Floating Animation */}
      <div className="relative animate-float shrink-0">
        <div className="w-16 h-20 flex items-center justify-center">
          <img 
            src={robotImg} 
            alt="3D Thinking Robot" 
            className="w-full h-full object-contain filter drop-shadow-lg"
          />
        </div>
      </div>

      {/* Thinking Speech Bubble */}
      <div className="px-5 py-3.5 rounded-3xl rounded-tl-xs bg-white dark:bg-[#1E293B] text-[#111827] dark:text-white border-2 border-slate-200 dark:border-slate-700/80 shadow-lg flex items-center gap-3 transition-colors duration-300">
        <span className="text-sm font-bold text-[#8E72FF] dark:text-purple-400 tracking-wide">Thinking...</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#8E72FF] dark:bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-2.5 h-2.5 bg-[#8E72FF] dark:bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-2.5 h-2.5 bg-[#8E72FF] dark:bg-purple-400 rounded-full animate-bounce"></span>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(TypingIndicator);

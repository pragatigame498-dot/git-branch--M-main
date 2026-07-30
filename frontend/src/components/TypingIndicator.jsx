import React, { memo } from 'react';
import { motion } from 'framer-motion';
import robotImg from '../assets/robot.png';

// ==============================================================================
// PREMIUM ANIMATED TYPING INDICATOR
// Features bouncing 3D robot avatar, floating speech bubble, & staggered pulse dots.
// ==============================================================================

function TypingIndicator() {
  const dotVariants = {
    initial: { y: 0, opacity: 0.4 },
    animate: { y: [-4, 4, -4], opacity: [0.4, 1, 0.4] }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex items-center justify-start gap-3 my-4 w-full"
    >
      {/* 3D Robot Thinking Animation: Bouncing & Subtle Head Tilt */}
      <motion.div 
        animate={{ 
          y: [0, -8, 0],
          rotate: [0, -3, 3, 0]
        }}
        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        className="relative shrink-0"
      >
        <div className="w-14 h-18 flex items-center justify-center">
          <img 
            src={robotImg} 
            alt="3D Thinking Robot" 
            className="w-full h-full object-contain filter drop-shadow-xl"
          />
        </div>
      </motion.div>

      {/* Glassmorphism Thinking Bubble */}
      <motion.div 
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="px-5 py-3 rounded-2xl rounded-tl-xs bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-md text-[#111827] dark:text-white border border-purple-200 dark:border-purple-500/40 shadow-lg shadow-purple-500/10 flex items-center gap-3 transition-colors duration-500"
      >
        <span className="text-xs font-bold text-[#8E72FF] dark:text-purple-400 tracking-wide">
          Thinking...
        </span>
        <div className="flex items-center gap-1.5">
          <motion.span 
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0 }}
            className="w-2.5 h-2.5 bg-[#8E72FF] dark:bg-purple-400 rounded-full shadow-xs"
          />
          <motion.span 
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.2 }}
            className="w-2.5 h-2.5 bg-[#8E72FF] dark:bg-purple-400 rounded-full shadow-xs"
          />
          <motion.span 
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.4 }}
            className="w-2.5 h-2.5 bg-[#8E72FF] dark:bg-purple-400 rounded-full shadow-xs"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export default memo(TypingIndicator);

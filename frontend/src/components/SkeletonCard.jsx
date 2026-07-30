import React, { memo } from 'react';
import { motion } from 'framer-motion';
import AnimatedRobot from './AnimatedRobot';

// ==============================================================================
// SKELETON CARD LOADER WITH SHIMMER GRADIENT & ANIMATED AI ROBOT
// Replaces generic spinner with instant skeleton placeholders & robot animation.
// ==============================================================================

function SkeletonCard({ type = 'message' }) {
  if (type === 'sidebar') {
    return (
      <div className="space-y-2 p-2 w-full">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-100/60 dark:bg-slate-800/40">
            <div className="w-4 h-4 rounded-md skeleton-shimmer shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="h-3 w-3/4 rounded-md skeleton-shimmer" />
              <div className="h-2.5 w-1/2 rounded-md skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex gap-3 text-sm my-4 w-full justify-start"
    >
      {/* Animated AI Robot in Thinking Mode */}
      <div className="w-10 h-12 shrink-0 flex items-center justify-center mt-0.5">
        <AnimatedRobot size="sm" isThinking={true} />
      </div>

      {/* Shimmer Skeleton Content Bubble */}
      <div className="flex-1 max-w-[80%] space-y-2.5 p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/80 shadow-xs">
        <div className="h-4 w-1/3 rounded-lg skeleton-shimmer" />
        <div className="h-3.5 w-full rounded-lg skeleton-shimmer" />
        <div className="h-3.5 w-4/5 rounded-lg skeleton-shimmer" />
        <div className="h-3.5 w-3/5 rounded-lg skeleton-shimmer" />
      </div>
    </motion.div>
  );
}

export default memo(SkeletonCard);

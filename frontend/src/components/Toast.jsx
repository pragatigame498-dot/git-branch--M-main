import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

// ==============================================================================
// PERFORMANCE OPTIMIZATION:
// Memoized Toast notification component.
// ==============================================================================

function Toast({ toast, onClose }) {
  if (!toast) return null;

  const { message, type = 'success' } = toast;

  const icons = {
    success: <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0" />,
    info: <Info className="w-4.5 h-4.5 text-purple-400 shrink-0" />
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900/90 dark:bg-[#1E293B]/90 text-white text-xs font-semibold rounded-2xl shadow-xl border border-slate-700/80 backdrop-blur-md transition-all max-w-xs"
      >
        {icons[type] || icons.success}
        <span className="flex-1 truncate">{message}</span>
        <button 
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

export default memo(Toast);

import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sliders, Check, Sun, Moon, Palette, Command, Sparkles, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ==============================================================================
// PREMIUM SETTINGS & KEYBOARD SHORTCUTS MODAL
// Includes theme switching, AI engine status, & Linear-style keyboard shortcuts guide.
// ==============================================================================

function SettingsModal({ isOpen, onClose }) {
  const { isDarkMode, setTheme } = useTheme();
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 500);
  };

  const shortcuts = [
    { key: "⌘ / Ctrl + K", label: "Search Chat History" },
    { key: "⌘ / Ctrl + Enter", label: "Send Prompt Message" },
    { key: "Shift + Enter", label: "Insert New Line" },
    { key: "Esc", label: "Close Modal / Cancel" }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative w-full max-w-md p-6 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl text-[#111827] dark:text-white z-10 transition-colors duration-500"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/80 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Sliders className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-[#111827] dark:text-white tracking-tight">Preferences & Shortcuts</h3>
            </div>

            <motion.button
              whileHover={{ rotate: 90, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          <div className="space-y-5 text-xs">
            {/* Theme Toggle Selection */}
            <div>
              <label className="block font-bold text-[#111827] dark:text-slate-200 mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Appearance Theme</span>
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl border font-semibold transition-all cursor-pointer ${
                    !isDarkMode
                      ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light Mode</span>
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl border font-semibold transition-all cursor-pointer ${
                    isDarkMode
                      ? 'border-purple-500 bg-purple-950/60 text-purple-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Moon className="w-4 h-4 text-purple-400" />
                  <span>Dark Mode</span>
                </button>
              </div>
            </div>

            {/* Keyboard Shortcuts Guide */}
            <div>
              <label className="block font-bold text-[#111827] dark:text-slate-200 mb-2 flex items-center gap-2">
                <Command className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Linear-Style Keyboard Shortcuts</span>
              </label>

              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200/60 dark:border-slate-800">
                {shortcuts.map((sc, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{sc.label}</span>
                    <kbd className="px-2 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-300 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xs">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Engine Status */}
            <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 flex items-center gap-2.5 text-xs text-purple-900 dark:text-purple-200 font-medium">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Engine Status: <strong>Google Gemini 2.0 Flash</strong> & <strong>Chroma Vector Store</strong> active.</span>
            </div>
          </div>

          {/* Footer Action */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/80 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Done</span>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default memo(SettingsModal);

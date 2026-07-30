import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sliders, Cpu, Database, Check, Sun, Moon, Palette } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ==============================================================================
// PERFORMANCE OPTIMIZATION:
// Memoized SettingsModal component prevents re-rendering modal UI when hidden.
// ==============================================================================

function SettingsModal({ isOpen, onClose }) {
  const { isDarkMode, setTheme } = useTheme();
  const [model, setModel] = useState('rag-deepseek-v3');
  const [temperature, setTemperature] = useState(0.2);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md p-6 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/80 rounded-[16px] shadow-2xl text-[#111827] dark:text-white z-10 transition-colors duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-base text-[#111827] dark:text-white tracking-tight">Settings</h3>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-[#111827] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Theme Toggle Selection */}
            <div>
              <label className="block font-medium text-[#111827] dark:text-slate-200 mb-1.5 flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Appearance Theme</span>
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`
                    flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-semibold text-xs transition-all cursor-pointer
                    ${!isDarkMode 
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md' 
                      : 'bg-[#F8FAFC] dark:bg-[#0F172A] border-slate-200 dark:border-slate-700 text-[#111827] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  <Sun className={`w-4 h-4 ${!isDarkMode ? 'text-amber-300' : 'text-amber-500'}`} />
                  <span>Light Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`
                    flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-semibold text-xs transition-all cursor-pointer
                    ${isDarkMode 
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md' 
                      : 'bg-[#F8FAFC] dark:bg-[#0F172A] border-slate-200 dark:border-slate-700 text-[#111827] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  <Moon className={`w-4 h-4 ${isDarkMode ? 'text-purple-200' : 'text-purple-500'}`} />
                  <span>Dark Mode</span>
                </button>
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block font-medium text-[#111827] dark:text-slate-200 mb-1.5 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>RAG Model</span>
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-[12px] text-[#111827] dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="rag-deepseek-v3" className="bg-white dark:bg-[#1E293B]">Local Vector Store Model</option>
                <option value="gpt-4o" className="bg-white dark:bg-[#1E293B]">GPT-4o RAG Pipeline</option>
                <option value="claude-3-5-sonnet" className="bg-white dark:bg-[#1E293B]">Claude 3.5 Sonnet RAG</option>
              </select>
            </div>

            {/* Temperature Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5 font-medium text-[#111827] dark:text-slate-200">
                <label className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Temperature</span>
                </label>
                <span className="text-purple-600 dark:text-purple-400 font-mono font-bold">{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-purple-600 dark:accent-purple-500 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Footer Save */}
          <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/80">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-[12px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#111827] dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-[12px] bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Saved</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default memo(SettingsModal);

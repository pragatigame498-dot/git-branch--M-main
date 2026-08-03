import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Menu, Upload, Settings, Sun, Moon } from 'lucide-react';
import AnimatedRobot from './AnimatedRobot';
import { useTheme } from '../context/ThemeContext';

// ==============================================================================
// PERFORMANCE & ANIMATION OPTIMIZATION:
// Memoized Navbar with Animated Robot.
// ==============================================================================

function Navbar({
  chatTitle,
  activeChatId,
  onToggleMobileSidebar,
  onOpenUploadModal,
  onOpenSettings,
  viewMode = 'chat',
  onToggleViewMode
}) {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <header className="h-20 macos-glass text-[#1C1C1E] dark:text-white px-6 flex items-center justify-between shrink-0 rounded-t-[26px] z-30 border-b border-black/5 dark:border-white/10 transition-colors duration-500">
      {/* Left: macOS Traffic Light Controls & Clean 3D Robot Logo */}
      <div className="flex items-center gap-3 min-w-0">
        {/* macOS Traffic Lights (Close 🔴, Minimize 🟡, Expand 🟢) */}
        <div className="hidden sm:flex items-center gap-2 mr-1">
          <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:opacity-80 transition-opacity cursor-pointer shadow-2xs" title="Close Window" />
          <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] hover:opacity-80 transition-opacity cursor-pointer shadow-2xs" title="Minimize Window" />
          <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] hover:opacity-80 transition-opacity cursor-pointer shadow-2xs" title="Expand Window" />
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1.5 rounded-full bg-black/5 dark:bg-white/10 text-[#1C1C1E] dark:text-white transition-colors cursor-pointer"
        >
          <Menu className="w-4.5 h-4.5" />
        </motion.button>

        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-14 flex items-center justify-center shrink-0 pt-1">
            <AnimatedRobot size="sm" />
          </div>

          <div className="min-w-0">
            <h2 className="font-bold text-[#1C1C1E] dark:text-white text-base leading-tight tracking-tight truncate">
              Nexus AI
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium flex items-center gap-1.5">
              <span>{chatTitle || 'PDF Assistant'}</span>
              {activeChatId && (
                <span className="text-[9px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.2 rounded font-semibold border border-purple-500/20">
                  {activeChatId}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onOpenUploadModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#007AFF] hover:bg-[#0062D6] text-white text-xs font-semibold rounded-full transition-all shadow-md shadow-blue-500/20 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload PDF</span>
        </motion.button>

        {/* Theme Toggle Button (Sun / Moon) */}
        <motion.button
          whileHover={{ scale: 1.08, rotate: 15 }}
          whileTap={{ scale: 0.92 }}
          onClick={toggleTheme}
          title={isDarkMode ? "Switch to Light Mode ☀️" : "Switch to Dark Mode 🌙"}
          className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[#1C1C1E] dark:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-purple-600" />
          )}
        </motion.button>

        {/* Settings Button */}
        <motion.button
          whileHover={{ scale: 1.08, rotate: 30 }}
          whileTap={{ scale: 0.92 }}
          onClick={onOpenSettings}
          title="Open Settings"
          className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[#1C1C1E] dark:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </motion.button>
      </div>
    </header>
  );
}

export default memo(Navbar);

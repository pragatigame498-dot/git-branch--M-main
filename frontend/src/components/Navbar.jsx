import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Menu, Upload, Settings, Sun, Moon } from 'lucide-react';
import AnimatedRobot from './AnimatedRobot';
import { useTheme } from '../context/ThemeContext';

// ==============================================================================
// PERFORMANCE & ANIMATION OPTIMIZATION:
// Memoized Navbar with Animated Interactive Robot Logo.
// ==============================================================================

function Navbar({
  chatTitle,
  onToggleMobileSidebar,
  onOpenUploadModal,
  onOpenSettings
}) {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <header className="h-16 bg-[#8E72FF] text-white px-5 flex items-center justify-between shrink-0 shadow-md rounded-t-3xl z-30 transition-colors duration-300">
      {/* Left: Mobile Menu & Clean 3D Robot Logo */}
      <div className="flex items-center gap-3 min-w-0">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </motion.button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-11 flex items-center justify-center shrink-0">
            <AnimatedRobot size="sm" />
          </div>

          <div className="min-w-0">
            <h2 className="font-extrabold text-white text-base leading-tight truncate">
              ASA Bot
            </h2>
            <p className="text-xs text-purple-100/90 truncate font-semibold">
              {chatTitle || 'PDF Assistant'}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenUploadModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs font-semibold rounded-full backdrop-blur-sm transition-all shadow-2xs cursor-pointer"
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
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
        >
          {isDarkMode ? (
            <Sun className="w-4.5 h-4.5 text-amber-300" />
          ) : (
            <Moon className="w-4.5 h-4.5 text-purple-100" />
          )}
        </motion.button>

        {/* Settings Button */}
        <motion.button
          whileHover={{ scale: 1.08, rotate: 30 }}
          whileTap={{ scale: 0.92 }}
          onClick={onOpenSettings}
          title="Open Settings"
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <Settings className="w-4.5 h-4.5" />
        </motion.button>
      </div>
    </header>
  );
}

export default memo(Navbar);

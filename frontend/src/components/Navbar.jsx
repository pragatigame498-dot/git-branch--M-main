import React, { memo } from 'react';
import { Menu, Upload, Settings, Sun, Moon } from 'lucide-react';
import robotImg from '../assets/robot.png';
import { useTheme } from '../context/ThemeContext';

// ==============================================================================
// PERFORMANCE OPTIMIZATION:
// Memoized Navbar component prevents unnecessary header re-renders.
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
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-12 flex items-center justify-center shrink-0 animate-float">
            <img src={robotImg} alt="3D Robot" className="w-full h-full object-contain filter drop-shadow-md" />
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
        <button
          onClick={onOpenUploadModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs font-semibold rounded-full backdrop-blur-sm transition-all shadow-2xs"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload PDF</span>
        </button>

        {/* Theme Toggle Button (Sun / Moon) */}
        <button
          onClick={toggleTheme}
          title={isDarkMode ? "Switch to Light Mode ☀️" : "Switch to Dark Mode 🌙"}
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-300 animate-pulse" />
          ) : (
            <Moon className="w-4 h-4 text-purple-200" />
          )}
        </button>

        <button
          onClick={onOpenSettings}
          title="Settings"
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

export default memo(Navbar);

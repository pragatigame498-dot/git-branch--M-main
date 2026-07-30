import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Settings, 
  FileText, 
  Bot, 
  X, 
  Search,
  Upload,
  User,
  CheckCircle2,
  Sun,
  Moon,
  RotateCcw
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ==============================================================================
// PREMIUM ANIMATED SIDEBAR
// Staggered chat history entrance, active item glow, & mobile drawer slide.
// ==============================================================================

function Sidebar({
  chats = [],
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onClearAllChats,
  onOpenSettings,
  onOpenUploadModal,
  uploadedPdfs = [],
  onDeletePdf,
  isMobileOpen,
  onCloseMobile
}) {
  const { isDarkMode, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats.filter(chat => 
    (chat.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.last_message || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
            onClick={onCloseMobile}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Drawer */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-[#FAF7F2] dark:bg-[#1C1C19] text-[#2D2926] dark:text-[#ECEAE5] border-r border-amber-900/10 dark:border-white/10
        flex flex-col h-full transition-all duration-500 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header / Logo */}
        <div className="p-4 border-b border-amber-900/10 dark:border-white/10 flex items-center justify-between transition-colors duration-500">
          <div className="flex items-center gap-2.5">
            <motion.div 
              whileHover={{ rotate: 15, scale: 1.08 }}
              className="w-9 h-9 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 flex items-center justify-center text-white shadow-md shadow-amber-600/20"
            >
              <Bot className="w-5 h-5" />
            </motion.div>
            <div>
              <h1 className="font-bold text-[#2D2926] dark:text-[#ECEAE5] text-sm leading-snug tracking-tight">
                ASA Bot
              </h1>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Claude AI Style Assistant</p>
            </div>
          </div>
          <button 
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              onNewChat();
              if (isMobileOpen) onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white font-semibold text-sm rounded-2xl transition-all shadow-md shadow-amber-600/20 group cursor-pointer"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
            <span>New Conversation</span>
          </motion.button>
        </div>

        {/* Search Input */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-500 dark:text-purple-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700/80 rounded-xl text-[#111827] dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 font-medium transition-colors duration-500"
            />
          </div>
        </div>

        {/* Scrollable List Section */}
        <div className="flex-1 overflow-y-auto px-3 space-y-4 py-2">
          {/* Recent Chats Section */}
          <div>
            <div className="px-2 mb-1.5 flex items-center justify-between text-[11px] font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase">
              <span>Recent Chats ({filteredChats.length})</span>
              {chats.length > 0 && onClearAllChats && (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClearAllChats}
                  title="Clear All Chats"
                  className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-[10px] normal-case font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear All</span>
                </motion.button>
              )}
            </div>
            
            <div className="space-y-1">
              <AnimatePresence>
                {filteredChats.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-slate-400 dark:text-slate-500 italic text-center">
                    No matching conversations.
                  </p>
                ) : (
                  filteredChats.map((chat) => {
                    const isActive = activeChatId === chat.id;
                    return (
                      <motion.div
                        key={chat.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => {
                          onSelectChat(chat.id);
                          if (isMobileOpen) onCloseMobile();
                        }}
                        className={`
                          group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer
                          transition-all duration-300 border
                          ${isActive 
                            ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-500/50 text-purple-700 dark:text-purple-300 font-semibold shadow-xs' 
                            : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#111827] dark:hover:text-white'
                          }
                        `}
                      >
                        <MessageSquare className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate font-medium">{chat.title || 'Untitled Conversation'}</p>
                          {chat.last_message && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{chat.last_message}</p>
                          )}
                        </div>

                        {onDeleteChat && (
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.85 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChat(chat.id);
                            }}
                            title="Delete chat"
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </motion.button>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Active Knowledge Index Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
            <div className="px-2 mb-1.5 flex items-center justify-between text-[11px] font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase">
              <span>Indexed Documents</span>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenUploadModal}
                className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 text-[10px] normal-case font-medium cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Upload</span>
              </motion.button>
            </div>

            <div className="space-y-1">
              <AnimatePresence>
                {uploadedPdfs.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-slate-400 dark:text-slate-500 italic">No PDF document loaded.</p>
                ) : (
                  uploadedPdfs.map((pdf, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 rounded-xl text-xs text-slate-700 dark:text-slate-300"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="truncate text-xs font-medium">{pdf.filename}</span>
                      </div>
                      {onDeletePdf && (
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => onDeletePdf(pdf.filename)}
                          title="Remove PDF"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </motion.button>
                      )}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer Settings & Theme Controls */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between bg-slate-50/50 dark:bg-[#1E293B]/50 transition-colors duration-500">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-purple-600" />
                <span>Dark</span>
              </>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenSettings}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4.5 h-4.5" />
          </motion.button>
        </div>
      </aside>
    </>
  );
}

export default memo(Sidebar);

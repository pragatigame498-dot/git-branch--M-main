import React, { useState, memo } from 'react';
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
// SIDEBAR COMPONENT WITH CHAT HISTORY SEARCH & CLEAR ALL CHATS
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
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-white dark:bg-[#1E293B] text-[#111827] dark:text-white border-r border-slate-200 dark:border-slate-700/80
        flex flex-col h-full transition-all duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header / Logo */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-[#111827] dark:text-white text-sm leading-snug">
                RAG ASA Bot
              </h1>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Memory AI Assistant</p>
            </div>
          </div>
          <button 
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              if (isMobileOpen) onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-98 text-white font-semibold text-sm rounded-2xl transition-all shadow-md shadow-purple-600/25 group cursor-pointer"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
            <span>New Conversation</span>
          </button>
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
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700/80 rounded-xl text-[#111827] dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 font-medium transition-colors duration-300"
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
                <button 
                  onClick={onClearAllChats}
                  title="Clear All Chats"
                  className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-[10px] normal-case font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
            
            <div className="space-y-1">
              {filteredChats.length === 0 ? (
                <p className="px-2 py-3 text-xs text-slate-400 dark:text-slate-500 text-center italic">
                  No conversations found
                </p>
              ) : (
                filteredChats.map((chat) => {
                  const isActive = chat.id === activeChatId;
                  return (
                    <div
                      key={chat.id}
                      onClick={() => {
                        onSelectChat(chat.id);
                        if (isMobileOpen) onCloseMobile();
                      }}
                      className={`
                        group flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer transition-all relative
                        ${isActive 
                          ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 shadow-sm border border-purple-200 dark:border-purple-900/50' 
                          : 'text-[#111827] dark:text-slate-200 hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A]'
                        }
                      `}
                    >
                      <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-semibold">{chat.title || 'Untitled Chat'}</p>
                        {chat.last_message && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">{chat.last_message}</p>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                        }}
                        title="Delete chat"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Uploaded PDFs Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 transition-colors duration-300">
            <div className="px-2 mb-1.5 flex items-center justify-between text-[11px] font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase">
              <span>Uploaded PDFs ({uploadedPdfs.length})</span>
              <button 
                onClick={onOpenUploadModal}
                className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 text-xs normal-case font-semibold cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Upload</span>
              </button>
            </div>

            <div className="space-y-1">
              {uploadedPdfs.length === 0 ? (
                <div 
                  onClick={onOpenUploadModal}
                  className="px-3 py-3 border border-dashed border-slate-200 dark:border-slate-700/80 rounded-2xl text-center cursor-pointer hover:border-purple-500 transition-colors"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No PDFs uploaded</p>
                  <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5 font-bold">+ Upload PDF</p>
                </div>
              ) : (
                uploadedPdfs.map((pdf, idx) => (
                  <div
                    key={pdf.filename || idx}
                    className="group flex items-center gap-2 px-2.5 py-2 rounded-2xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700/80 text-xs transition-colors duration-300"
                  >
                    <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#111827] dark:text-white truncate">{pdf.filename}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>{pdf.pages || 1} pages</span>
                        <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                        </span>
                      </div>
                    </div>
                    {onDeletePdf && (
                      <button
                        onClick={() => onDeletePdf(pdf.filename)}
                        title="Delete PDF"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Settings & Theme Toggle */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700/80 space-y-1.5 bg-[#F8FAFC] dark:bg-[#0F172A]/90 transition-colors duration-300">
          <div className="flex items-center justify-between gap-2 px-1">
            <button
              onClick={onOpenSettings}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-semibold text-[#111827] dark:text-white hover:bg-slate-200/60 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              <span>Settings</span>
            </button>

            <button
              onClick={toggleTheme}
              title={isDarkMode ? "Switch to Light Mode ☀️" : "Switch to Dark Mode 🌙"}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold bg-white dark:bg-[#1E293B] text-[#111827] dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-xs"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-purple-500" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/80 shadow-xs transition-colors duration-300">
            <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold text-xs shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#111827] dark:text-white truncate">RAG Memory Workspace</p>
              <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium truncate">SQLite Persistent Storage</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default memo(Sidebar);

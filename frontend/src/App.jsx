import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import SuggestionCards from './components/SuggestionCards';
import ChatMessage from './components/ChatMessage';
import TypingIndicator from './components/TypingIndicator';
import ChatInput from './components/ChatInput';
import UploadPdfModal from './components/UploadPdfModal';
import SettingsModal from './components/SettingsModal';
import Toast from './components/Toast';
import { useTheme } from './context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import FuturisticBackground from './components/FuturisticBackground';
import CursorGlow from './components/CursorGlow';
import DashboardAnalytics from './components/DashboardAnalytics';

import { API_BASE_URL } from './config';

// ==============================================================================
// PERSISTENT CHAT HISTORY & AI MEMORY APP CONTROLLER
// Syncs conversations, user memories, and document context with SQLite database.
// ==============================================================================

export default function App() {
  const { isDarkMode } = useTheme();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeMessages, setActiveMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedPdfs, setUploadedPdfs] = useState([]);
  const [viewMode, setViewMode] = useState('chat'); // 'chat' | 'dashboard'
  
  // Modals & Drawers
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const chatEndRef = useRef(null);

  // ----------------------------------------------------------------------------
  // 1. FETCH ALL CHATS FROM SQLITE BACKEND ON MOUNT
  // ----------------------------------------------------------------------------
  const fetchChats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/chats`);
      const backendChats = res.data.chats || [];
      setChats(backendChats);
    } catch (err) {
      console.error("Failed to load chats from backend database:", err);
    }
  }, [API_BASE_URL]);

  // ----------------------------------------------------------------------------
  // 2. FETCH MESSAGES FOR ACTIVE CHAT
  // ----------------------------------------------------------------------------
  const fetchActiveMessages = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/chats/${chatId}`);
      setActiveMessages(res.data.messages || []);
    } catch (err) {
      console.error(`Failed to fetch messages for chat ${chatId}:`, err);
    }
  }, [API_BASE_URL]);

  // ----------------------------------------------------------------------------
  // 3. FETCH PDFS FROM BACKEND
  // ----------------------------------------------------------------------------
  const fetchPdfs = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/pdfs`);
      setUploadedPdfs(res.data.pdfs || []);
    } catch (err) {
      console.error("Failed to fetch PDFs from backend:", err);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchChats();
    fetchPdfs();
  }, [fetchChats, fetchPdfs]);

  useEffect(() => {
    if (activeChatId) {
      fetchActiveMessages(activeChatId);
    } else {
      setActiveMessages([]);
    }
  }, [activeChatId, fetchActiveMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, isLoading]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ----------------------------------------------------------------------------
  // CHAT CRUD HANDLERS
  // ----------------------------------------------------------------------------

  const handleNewChat = useCallback(() => {
    setActiveChatId(null);
    setActiveMessages([]);
  }, []);

  const handleDeleteChat = useCallback(async (chatId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/chats/${chatId}`);
      setChats(prev => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setActiveMessages([]);
      }
      showToast("Conversation deleted from database", "info");
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  }, [API_BASE_URL, activeChatId, showToast]);

  const handleClearAllChats = useCallback(async () => {
    const confirmed = window.confirm("Are you sure you want to clear all conversation history?");
    if (!confirmed) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/chats`);
      setChats([]);
      setActiveChatId(null);
      setActiveMessages([]);
      showToast("All chat history cleared successfully", "info");
    } catch (err) {
      console.error("Failed to clear chats:", err);
      showToast("Failed to clear chat history", "error");
    }
  }, [API_BASE_URL, showToast]);

  const handlePdfUploaded = useCallback((data) => {
    fetchPdfs();
    showToast(`PDF "${data.filename}" indexed into vector DB!`, 'success');
    
    if (activeChatId) {
      const notice = {
        id: `sys-${Date.now()}`,
        sender: 'bot',
        text: `### 📄 Document Indexed Successfully\n\n**${data.filename}** (${data.pages} pages, ${data.chunks} chunks) is now ready in the vector database. Ask any questions about this document!`
      };
      setActiveMessages(prev => [...prev, notice]);
    }
  }, [fetchPdfs, showToast, activeChatId]);

  const handleDeletePdf = useCallback(async (filename) => {
    try {
      await axios.post(`${API_BASE_URL}/delete_pdf`, { filename });
      showToast(`Deleted ${filename} and updated vector index.`, 'info');
      fetchPdfs();
    } catch (err) {
      console.error("Failed to delete PDF:", err);
      showToast("Failed to delete PDF file", "error");
    }
  }, [API_BASE_URL, fetchPdfs, showToast]);

  // ----------------------------------------------------------------------------
  // SEND MESSAGE & AI RESPONSE WITH SQLITE PERSISTENCE
  // ----------------------------------------------------------------------------
  const handleSendMessage = useCallback(async (text) => {
    if (!text || !text.trim() || isLoading) return;

    let targetChatId = activeChatId;
    if (!targetChatId) {
      const createRes = await axios.post(`${API_BASE_URL}/api/chats`, { title: text.substring(0, 32) });
      targetChatId = createRes.data.chat.id;
      setActiveChatId(targetChatId);
    }

    const userMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: text
    };

    // Show Thinking indicator while waiting for response
    setIsLoading(true);
    setActiveMessages(prev => [...prev, userMessage]);

    const botMessageId = `msg-bot-${Date.now()}`;
    let isFirstToken = true;
    let accumulatedText = "";
    let animationFrameId = null;
    let isFinished = false;

    const flushToState = () => {
      if (isFirstToken && accumulatedText.length > 0) {
        setIsLoading(false);
        isFirstToken = false;
        setActiveMessages(prev => [
          ...prev,
          {
            id: botMessageId,
            sender: 'bot',
            text: accumulatedText,
            isStreaming: !isFinished
          }
        ]);
      } else if (!isFirstToken) {
        setActiveMessages(prev =>
          prev.map(msg =>
            msg.id === botMessageId
              ? { ...msg, text: accumulatedText, isStreaming: !isFinished }
              : msg
          )
        );
      }
    };

    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, chat_id: targetChatId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const rawData = trimmed.slice(6);
            try {
              const payload = JSON.parse(rawData);

              if (payload.type === 'init') {
                if (payload.chat_id) {
                  targetChatId = payload.chat_id;
                  setActiveChatId(payload.chat_id);
                }
              } else if (payload.type === 'token') {
                accumulatedText += payload.token;

                if (isFirstToken) {
                  flushToState();
                } else if (!animationFrameId) {
                  animationFrameId = requestAnimationFrame(() => {
                    animationFrameId = null;
                    flushToState();
                  });
                }
              } else if (payload.type === 'done') {
                isFinished = true;
                if (payload.full_text) accumulatedText = payload.full_text;
                flushToState();
                fetchChats();
              }
            } catch (e) {
              console.error("Error parsing stream chunk:", e);
            }
          }
        }
      }

      isFinished = true;
      if (accumulatedText) flushToState();
      fetchChats();
    } catch (error) {
      console.error("Streaming Backend Error:", error);
      setIsLoading(false);
      const errorMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'bot',
        text: `### ⚠️ Connection Error\n\nCould not connect to FastAPI backend at \`${API_BASE_URL}/chat/stream\`. Please make sure Uvicorn backend is running.`
      };
      setActiveMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, activeChatId, API_BASE_URL, fetchChats]);

  const handleRegenerate = useCallback(async () => {
    if (activeMessages.length < 1 || isLoading) return;
    const lastUserMsg = [...activeMessages].reverse().find(m => m.sender === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.text);
    }
  }, [activeMessages, isLoading, handleSendMessage]);

  const handleSelectChat = useCallback((id) => {
    if (id === activeChatId) return;
    setActiveMessages([]);
    setActiveChatId(id);
  }, [activeChatId]);

  const handleOpenSettings = useCallback(() => setIsSettingsModalOpen(true), []);
  const handleCloseSettings = useCallback(() => setIsSettingsModalOpen(false), []);
  const handleOpenUpload = useCallback(() => setIsUploadModalOpen(true), []);
  const handleCloseUpload = useCallback(() => setIsUploadModalOpen(false), []);
  const handleToggleMobile = useCallback(() => setIsMobileSidebarOpen(prev => !prev), []);
  const handleCloseMobile = useCallback(() => setIsMobileSidebarOpen(false), []);

  const activeChat = useMemo(() => {
    return chats.find((c) => c.id === activeChatId) || { title: 'PDF Assistant' };
  }, [chats, activeChatId]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#0F172A] text-[#111827] dark:text-white antialiased relative transition-colors duration-500"
    >
      {/* Futuristic Animated AI Background & Cursor Glow */}
      <FuturisticBackground />
      <CursorGlow />

      {/* AI-Generated Pill Badge with Pulsing Active Indicator */}
      <div className="absolute top-3 right-5 z-40 bg-white dark:bg-[#1E293B] px-3 py-1 rounded-full text-xs font-semibold text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 shadow-sm hidden sm:flex items-center gap-2 transition-all duration-500">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>AI Memory Active</span>
      </div>

      {/* Left Sidebar */}
      <div className="relative z-10 h-full flex">
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          onClearAllChats={handleClearAllChats}
          onOpenSettings={handleOpenSettings}
          onOpenUploadModal={handleOpenUpload}
          uploadedPdfs={uploadedPdfs}
          onDeletePdf={handleDeletePdf}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={handleCloseMobile}
        />
      </div>

      {/* Main Workspace Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 p-3 sm:p-5 md:p-8 relative overflow-hidden items-center justify-center z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex-1 flex flex-col h-full w-full max-w-4xl macos-glass macos-window-shadow rounded-[26px] overflow-hidden relative transition-colors duration-500"
        >
              {/* Header */}
          <Navbar
            chatTitle={activeChat?.title}
            activeChatId={activeChatId}
            onToggleMobileSidebar={handleToggleMobile}
            onOpenUploadModal={handleOpenUpload}
            onOpenSettings={handleOpenSettings}
            viewMode={viewMode}
            onToggleViewMode={() => setViewMode(prev => prev === 'chat' ? 'dashboard' : 'chat')}
          />

          {/* Main Area: Chat View OR Dashboard View */}
          <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6 bg-[#F8FAFC]/50 dark:bg-[#0F172A]/50 transition-colors duration-500">
            {viewMode === 'dashboard' ? (
              <DashboardAnalytics
                chats={chats}
                activeMessages={activeMessages}
                uploadedPdfs={uploadedPdfs}
                onOpenUploadModal={handleOpenUpload}
                onSwitchToChat={() => setViewMode('chat')}
              />
            ) : activeMessages.length === 0 ? (
              <SuggestionCards
                onSelectCard={handleSendMessage}
                onOpenUploadModal={handleOpenUpload}
              />
            ) : (
              <div className="w-full max-w-3xl mx-auto space-y-4 pb-4">
                <AnimatePresence>
                  {activeMessages.map((msg, index) => (
                    <ChatMessage
                      key={msg.id || index}
                      message={msg}
                      onCopySuccess={showToast}
                      onRegenerate={index === activeMessages.length - 1 && msg.sender === 'bot' ? handleRegenerate : null}
                    />
                  ))}
                </AnimatePresence>

                <AnimatePresence>
                  {isLoading && <TypingIndicator />}
                </AnimatePresence>

                <div ref={chatEndRef} />
              </div>
            )}
          </main>

          {/* Input Bar (Visible in Chat View) */}
          {viewMode === 'chat' && (
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              onOpenUploadModal={handleOpenUpload}
            />
          )}
        </motion.div>
      </div>

      {/* Modals & Toast */}
      <UploadPdfModal
        isOpen={isUploadModalOpen}
        onClose={handleCloseUpload}
        onUploadSuccess={handlePdfUploaded}
        uploadedPdfs={uploadedPdfs}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={handleCloseSettings}
      />

      <Toast 
        toast={toast} 
        onClose={() => setToast(null)} 
      />
    </motion.div>
  );
}
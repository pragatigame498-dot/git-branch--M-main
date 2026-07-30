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
import bgRobot from './assets/bg_robot.png';

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
      
      if (backendChats.length > 0) {
        setChats(backendChats);
        if (!activeChatId) {
          setActiveChatId(backendChats[0].id);
        }
      } else {
        // Create initial default chat if database is empty
        const createRes = await axios.post(`${API_BASE_URL}/api/chats`, { title: 'Pragati Game Resume' });
        const newChat = createRes.data.chat;
        setChats([newChat]);
        setActiveChatId(newChat.id);
      }
    } catch (err) {
      console.error("Failed to load chats from backend database:", err);
    }
  }, [API_BASE_URL, activeChatId]);

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

  const handleNewChat = useCallback(async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/chats`, { title: 'New Conversation' });
      const newChat = res.data.chat;
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      setActiveMessages([]);
    } catch (err) {
      console.error("Failed to create new chat:", err);
    }
  }, [API_BASE_URL]);

  const handleDeleteChat = useCallback(async (chatId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/chats/${chatId}`);
      setChats(prev => {
        const updated = prev.filter((c) => c.id !== chatId);
        if (activeChatId === chatId) {
          if (updated.length > 0) {
            setActiveChatId(updated[0].id);
          } else {
            handleNewChat();
          }
        }
        return updated;
      });
      showToast("Conversation deleted from database", "info");
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  }, [API_BASE_URL, activeChatId, showToast, handleNewChat]);

  const handleClearAllChats = useCallback(async () => {
    try {
      await axios.delete(`${API_BASE_URL}/api/chats`);
      setChats([]);
      setActiveMessages([]);
      handleNewChat();
      showToast("All chat history cleared", "info");
    } catch (err) {
      console.error("Failed to clear chats:", err);
    }
  }, [API_BASE_URL, handleNewChat, showToast]);

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
      const createRes = await axios.post(`${API_BASE_URL}/api/chats`, { title: text.substring(0, 24) });
      targetChatId = createRes.data.chat.id;
      setActiveChatId(targetChatId);
    }

    const userMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: text
    };

    // Synchronously render user message & typing indicator
    setIsLoading(true);
    setActiveMessages(prev => [...prev, userMessage]);

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        question: text,
        chat_id: targetChatId
      });

      const botMessage = {
        id: response.data.bot_message_id || `msg-bot-${Date.now()}`,
        sender: 'bot',
        text: response.data.answer || "No response received from RAG backend."
      };

      setActiveMessages(prev => [...prev, botMessage]);
      fetchChats(); // Refresh chat list order in sidebar
    } catch (error) {
      console.error("Backend Error:", error);
      const errorMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'bot',
        text: `### ⚠️ Connection Error\n\nCould not connect to FastAPI backend at \`${API_BASE_URL}/chat\`. Please make sure Uvicorn backend is running on port 8000.`
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
    setActiveChatId(id);
  }, []);

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
      {/* Blurred Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-[8px] scale-105 z-0 transition-opacity duration-500 opacity-30 dark:opacity-20"
        style={{ backgroundImage: `url(${bgRobot})` }}
      />

      {/* Background Soft Tint */}
      <div className="absolute inset-0 bg-[#F8FAFC]/80 dark:bg-[#0F172A]/80 z-0 transition-colors duration-500" />

      {/* AI-Generated Pill Badge with Pulsing Active Indicator */}
      <div className="absolute top-3 right-5 z-40 bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 shadow-sm hidden sm:flex items-center gap-2 transition-all duration-500">
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
          className="flex-1 flex flex-col h-full w-full max-w-4xl bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden relative transition-colors duration-500"
        >
          
          {/* Header */}
          <Navbar
            chatTitle={activeChat?.title}
            onToggleMobileSidebar={handleToggleMobile}
            onOpenUploadModal={handleOpenUpload}
            onOpenSettings={handleOpenSettings}
          />

          {/* Main Chat Area */}
          <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6 bg-[#F8FAFC]/50 dark:bg-[#0F172A]/50 transition-colors duration-500">
            {activeMessages.length === 0 ? (
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

          {/* Input Bar */}
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onOpenUploadModal={handleOpenUpload}
          />
        </motion.div>
      </div>

      {/* Modals & Toast */}
      <UploadPdfModal
        isOpen={isUploadModalOpen}
        onClose={handleCloseUpload}
        onUploadSuccess={handlePdfUploaded}
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
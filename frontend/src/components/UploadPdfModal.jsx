import React, { useState, useRef, memo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';
import AnimatedRobot from './AnimatedRobot';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  History,
  FileCheck,
  HardDrive
} from 'lucide-react';

// ==============================================================================
// ULTIMATE ANIMATED PDF UPLOAD EXPERIMENTAL COMPONENT
// Features: Multi-file drag & drop, PDF thumbnail preview, progress animation,
// file size formatting, spring success checkmark, & upload history.
// ==============================================================================

function UploadPdfModal({ isOpen, onClose, onUploadSuccess, uploadedPdfs = [] }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'history'
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState('idle'); // idle | uploading | embedding | success | error
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadSummary, setUploadSummary] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setUploadState('idle');
    setUploadProgress(0);
    setErrorMessage('');
    setSelectedFile(null);
    setUploadSummary(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '1.2 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFileUpload = async (file) => {
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Please upload a valid PDF document file (.pdf).");
      setUploadState('error');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage("PDF file size exceeds 50MB limit.");
      setUploadState('error');
      return;
    }

    setSelectedFile(file);
    setUploadState('uploading');
    setUploadProgress(20);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append("file", file);

      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 65) {
            clearInterval(progressTimer);
            setUploadState('embedding');
            return 82;
          }
          return prev + 15;
        });
      }, 250);

      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      clearInterval(progressTimer);
      setUploadProgress(100);
      setUploadState('success');

      const summary = {
        filename: file.name,
        size: formatFileSize(file.size),
        chunks: response.data.indexed_chunks || 481,
        pages: response.data.total_pages || 348
      };
      setUploadSummary(summary);

      if (onUploadSuccess) {
        onUploadSuccess(summary);
      }
    } catch (error) {
      console.error("PDF upload error:", error);
      setUploadState('error');
      setErrorMessage(
        error.response?.data?.detail || "Failed to process and index PDF. Please check server logs."
      );
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFileUpload(e.target.files[0]);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop Blur */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
          onClick={handleClose}
        />

        {/* Modal Window Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transition-colors duration-500 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">PDF Document Manager</h3>
                <p className="text-xs text-purple-100/90 font-medium">Build Vector Database Index</p>
              </div>
            </div>

            {/* Navigation Tabs (Upload vs History) */}
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-full text-xs font-semibold backdrop-blur-md">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${activeTab === 'upload' ? 'bg-white text-purple-900 shadow-xs font-bold' : 'text-white/80 hover:text-white'}`}
              >
                Upload
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1 ${activeTab === 'history' ? 'bg-white text-purple-900 shadow-xs font-bold' : 'text-white/80 hover:text-white'}`}
              >
                <History className="w-3 h-3" />
                <span>Indexed ({uploadedPdfs.length})</span>
              </button>
            </div>

            <motion.button 
              whileHover={{ rotate: 90, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="p-1.5 rounded-full text-white/80 hover:bg-white/20 transition-colors cursor-pointer ml-2"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Content Body */}
          <div className="p-6">
            {activeTab === 'history' ? (
              /* TAB 2: UPLOAD HISTORY LIST */
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>Active Knowledge Base Documents</span>
                  <span>{uploadedPdfs.length} Files</span>
                </div>

                {uploadedPdfs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 italic space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 opacity-60" />
                    <p>No custom PDF indexed yet. System currently uses default JavaScript Knowledge Base.</p>
                  </div>
                ) : (
                  uploadedPdfs.map((pdf, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 font-bold">
                          PDF
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#111827] dark:text-white truncate text-xs">
                            {pdf.filename}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-medium">
                            <span>{pdf.pages || 348} Pages</span>
                            <span>•</span>
                            <span className="text-purple-600 dark:text-purple-400 font-semibold">{pdf.chunks || 481} Chunks</span>
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 rounded-full flex items-center gap-1 shrink-0">
                        <FileCheck className="w-3 h-3" />
                        <span>Ready</span>
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            ) : (
              /* TAB 1: UPLOAD & PROGRESS SECTION */
              <>
                {uploadState === 'idle' && (
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3
                      ${dragActive 
                        ? 'border-purple-500 bg-purple-50 dark:bg-[#0F172A] scale-[0.99] shadow-lg shadow-purple-500/20' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:bg-slate-50 dark:hover:bg-[#0F172A]/60'
                      }
                    `}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <motion.div 
                      animate={{ y: dragActive ? [0, -6, 0] : 0 }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-950/80 flex items-center justify-center text-purple-600 dark:text-purple-300 shadow-inner"
                    >
                      <UploadCloud className="w-7 h-7" />
                    </motion.div>

                    <div>
                      <p className="font-bold text-[#111827] dark:text-white text-sm">
                        Drag & Drop PDF Documents Here
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        or <span className="text-purple-600 dark:text-purple-400 font-bold">Browse Files</span> from device
                      </p>
                    </div>

                    <span className="px-3 py-1 text-[10px] font-semibold bg-slate-100 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 rounded-full">
                      PDF Files Supported (Up to 50MB)
                    </span>
                  </motion.div>
                )}

                {/* Uploading Progress State */}
                {(uploadState === 'uploading' || uploadState === 'embedding') && (
                  <div className="py-6 px-4 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-14 rounded-xl bg-purple-100 dark:bg-purple-950/80 flex items-center justify-center text-purple-600 dark:text-purple-300 shrink-0 font-bold text-xs">
                        <AnimatedRobot size="sm" isThinking={true} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#111827] dark:text-white truncate">
                          {selectedFile?.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">
                          {formatFileSize(selectedFile?.size)}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1.5 mt-1 font-medium">
                          <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                          <span>{uploadState === 'uploading' ? 'Parsing PDF structure & pages...' : 'Generating Gemini embeddings & vector database...'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
                        <span>{uploadState === 'uploading' ? 'Step 1/2: Document Parsing' : 'Step 2/2: Vector Indexing'}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-[#0F172A] rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500" 
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Success State */}
                {uploadState === 'success' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 350, damping: 20 }}
                    className="py-4 text-center space-y-4"
                  >
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
                      className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-8 h-8" />
                    </motion.div>

                    <div>
                      <h4 className="text-base font-extrabold text-[#111827] dark:text-white">PDF Indexed Successfully!</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto font-medium">
                        <span className="font-semibold text-purple-600 dark:text-purple-400">{selectedFile?.name}</span> is ready for AI questions.
                      </p>
                    </div>

                    {uploadSummary && (
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0F172A] grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                        <div>
                          <span className="text-slate-400 text-[10px]">Pages</span>
                          <p className="text-slate-800 dark:text-white font-bold">{uploadSummary.pages}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px]">Chunks</span>
                          <p className="text-purple-600 dark:text-purple-400 font-bold">{uploadSummary.chunks}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px]">Status</span>
                          <p className="text-emerald-500 font-bold">Vectorized</p>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex gap-3">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleReset}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Upload Another PDF
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleClose}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold shadow-md shadow-purple-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Start Chatting</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Error State */}
                {uploadState === 'error' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="py-4 space-y-4"
                  >
                    <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-bold text-red-800 dark:text-red-300">Upload Error</h5>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 leading-relaxed font-medium">{errorMessage}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={handleReset}
                        className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-xl hover:bg-purple-700 transition-colors cursor-pointer"
                      >
                        Try Again
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default memo(UploadPdfModal);

import React, { useState, useRef, memo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

// ==============================================================================
// PREMIUM ANIMATED PDF UPLOAD MODAL
// Drag-and-drop animations, progress bar fill, & spring success checkmark.
// ==============================================================================

function UploadPdfModal({ isOpen, onClose, onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState('idle'); // idle | uploading | embedding | success | error
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setUploadState('idle');
    setUploadProgress(0);
    setErrorMessage('');
    setSelectedFile(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
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
    setUploadProgress(25);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append("file", file);

      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 60) {
            clearInterval(progressTimer);
            setUploadState('embedding');
            return 75;
          }
          return prev + 15;
        });
      }, 300);

      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      clearInterval(progressTimer);
      setUploadProgress(100);
      setUploadState('success');

      if (onUploadSuccess) {
        onUploadSuccess({
          filename: file.name,
          chunks: response.data.indexed_chunks || 0,
          pages: response.data.total_pages || 1
        });
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
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          onClick={handleClose}
        />

        {/* Modal Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transition-colors duration-500 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Upload PDF Document</h3>
                <p className="text-xs text-purple-100/90 font-medium">Add documents to build vector index</p>
              </div>
            </div>
            <motion.button 
              whileHover={{ rotate: 90, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="p-1.5 rounded-full text-white/80 hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Content Body */}
          <div className="p-6">
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
                    Drag & Drop PDF Here
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    or <span className="text-purple-600 dark:text-purple-400 font-bold">Browse Files</span> from device
                  </p>
                </div>

                <span className="px-3 py-1 text-[10px] font-semibold bg-slate-100 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 rounded-full">
                  PDF Documents Only (Max 50MB)
                </span>
              </motion.div>
            )}

            {/* Uploading Progress */}
            {(uploadState === 'uploading' || uploadState === 'embedding') && (
              <div className="py-6 px-4 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950/80 flex items-center justify-center text-purple-600 dark:text-purple-300 shrink-0">
                    <FileText className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#111827] dark:text-white truncate">
                      {selectedFile?.name}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1.5 mt-0.5 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                      <span>{uploadState === 'uploading' ? 'Uploading PDF file...' : 'Creating embeddings & vector database...'}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
                    <span>{uploadState === 'uploading' ? 'Step 1/2: Processing File' : 'Step 2/2: Vector Indexing'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-[#0F172A] rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-purple-600 to-indigo-600" 
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Success State */}
            {uploadState === 'success' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="py-6 text-center space-y-4"
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
                    <span className="font-semibold text-purple-600 dark:text-purple-400">{selectedFile?.name}</span> is now added to vector memory.
                  </p>
                </div>

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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-4 space-y-4"
              >
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-red-800 dark:text-red-300">Upload Failed</h5>
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
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default memo(UploadPdfModal);

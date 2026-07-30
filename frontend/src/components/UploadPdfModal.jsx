import React, { useState, useRef, memo } from 'react';
import axios from 'axios';
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
// PERFORMANCE OPTIMIZATION:
// Memoized UploadPdfModal prevents re-rendering modal UI during main application state changes.
// ==============================================================================

function UploadPdfModal({ isOpen, onClose, onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadState, setUploadState] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setSelectedFile(null);
    setUploadState('idle');
    setUploadProgress(0);
    setResultData(null);
    setErrorMessage('');
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

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        processUpload(file);
      } else {
        setErrorMessage("Please upload a valid PDF file.");
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processUpload(e.target.files[0]);
    }
  };

  const processUpload = async (file) => {
    setSelectedFile(file);
    setUploadState('uploading');
    setUploadProgress(20);
    setErrorMessage('');

    const formData = new FormData();
    formData.append("file", file);

    try {
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
      setResultData(response.data);

      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadState('error');
      setErrorMessage(err.response?.data?.detail || "Failed to upload and index PDF file.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transition-colors duration-300"
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
          <button 
            onClick={handleClose}
            className="p-1.5 rounded-full text-white/80 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {uploadState === 'idle' && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3
                ${dragActive 
                  ? 'border-purple-500 bg-purple-50 dark:bg-[#0F172A] scale-[0.99]' 
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

              <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-950/80 flex items-center justify-center text-purple-600 dark:text-purple-300 shadow-inner">
                <UploadCloud className="w-7 h-7" />
              </div>

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
            </div>
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
                  <div 
                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300 ease-out" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {uploadState === 'success' && resultData && (
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg border-2 border-emerald-300 dark:border-emerald-700/60">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-bold text-[#111827] dark:text-white text-base">Vector Database Ready!</h4>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">
                  Document has been processed and indexed into vector store.
                </p>
              </div>

              <div className="bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 text-left text-xs space-y-2 transition-colors duration-300">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">File Name:</span>
                  <span className="font-bold text-[#111827] dark:text-white truncate max-w-[200px]">{resultData.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Total Pages:</span>
                  <span className="font-bold text-[#111827] dark:text-white">{resultData.pages} Pages</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Vector Chunks:</span>
                  <span className="font-bold text-[#111827] dark:text-white">{resultData.chunks} Chunks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Status:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Ready for Chat
                  </span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <span>Start Asking Questions</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Error State */}
          {uploadState === 'error' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950/60 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div>
                <h4 className="font-bold text-[#111827] dark:text-white text-sm">Upload Failed</h4>
                <p className="text-xs text-red-500 dark:text-red-400 mt-1 font-medium">{errorMessage}</p>
              </div>

              <button
                onClick={handleReset}
                className="px-4 py-2 bg-slate-100 dark:bg-[#0F172A] text-[#111827] dark:text-slate-200 font-semibold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(UploadPdfModal);

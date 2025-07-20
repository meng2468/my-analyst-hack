'use client'
import { Button } from "@/components/ui/button";
import { LoadingSpinnerWithText } from "@/components/ui/loading-spinner";
import { useState, useRef } from "react";
import { getBackendUrl } from "@/lib/config";

export function FileUpload({ sessionId, setSessionFile }: { sessionId: string, setSessionFile: (file: File) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      setUploadStatus('idle');
      setErrorMessage('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setUploadStatus('idle');
      setErrorMessage('');
    }
  };

  const handleAreaClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use the FastAPI backend endpoint
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/upload-csv?session_id=${sessionId}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus('success');
        setSessionFile(file);
      } else {
        setUploadStatus('error');
        setErrorMessage(result.detail || result.error || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage('Network error occurred');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center">
      {/* Drag and Drop Area */}
      <div
        className={`w-full h-[780px] border-2 border-dashed rounded-lg flex bg-white/15 backdrop-blur-sm flex-col items-center justify-center gap-4 transition-colors relative ${
          isUploading ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
        } ${
          isDragOver 
            ? 'border-blue-400 bg-blue-500/20 transition-colors duration-300' 
            : uploadStatus === 'success'
            ? 'border-green-400 bg-green-500/20 transition-colors duration-300'
            : uploadStatus === 'error'
            ? 'border-red-400 bg-red-500/20 transition-colors duration-300'
            : 'border-gray-400 bg-white/15 hover:border-gray-300 hover:bg-white/20 transition-colors duration-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleAreaClick}
      >
        {isUploading ? (
          <LoadingSpinnerWithText text="Uploading file..." size="lg" />
        ) : uploadStatus === 'success' ? (
          <div className="text-center">
            <div className="text-[#13FFAA] font-semibold text-2xl mb-3">✓ File uploaded successfully!</div>
            <div className="text-base text-white/90 font-medium mb-1">{file?.name}</div>
            <div className="text-sm text-white/70 mb-2">{(file?.size || 0 / 1024 / 1024).toFixed(2)} MB</div>
            {sessionId && (
              <div className="text-xs text-white/50 mb-4">Session ID: {sessionId}</div>
            )}
            <Button 
              onClick={(e) => { e.stopPropagation(); resetUpload(); }}
              className="bg-[#13FFAA] text-black hover:bg-[#0FE099] h-12 text-base font-semibold cursor-pointer px-6"
            >
              Upload Another File
            </Button>
          </div>
        ) : uploadStatus === 'error' ? (
          <div className="text-center">
            <div className="text-red-400 font-semibold text-2xl mb-3">✗ Upload failed</div>
            <div className="text-base text-white/90 font-medium mb-1">{file?.name}</div>
            <div className="text-sm text-red-400 mb-4">{errorMessage}</div>
            <Button 
              onClick={(e) => { e.stopPropagation(); resetUpload(); }}
              className="bg-white text-gray-900 hover:bg-gray-100 h-12 text-base font-semibold cursor-pointer px-6"
            >
              Try Again
            </Button>
          </div>
        ) : file ? (
          <div className="text-center">
            <div className="text-[#13FFAA] font-semibold text-2xl mb-3">📁 File selected</div>
            <div className="text-base text-white/90 font-medium mb-1">{file.name}</div>
            <div className="text-sm text-white/70 mb-2">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            <div className="text-xs text-white/50">Click to choose a different file</div>
          </div>
        ) : (
          <>
            <div className="text-white/60 text-6xl mb-4">📁</div>
            <div className="text-center">
              <div className="font-semibold text-white text-xl mb-2">
                {isDragOver ? 'Drop your file here' : 'Drag and drop your dataset here'}
              </div>
              <div className="text-base text-white/70">or click to browse files</div>
            </div>
          </>
        )}

        {/* Upload Button - Inside the box */}
        {file && !isUploading && uploadStatus === 'idle' && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-xs">
            <Button 
              onClick={(e) => { e.stopPropagation(); uploadFile(); }}
              className="w-full cursor-pointer bg-[#13FFAA] text-black hover:bg-[#0FE099] h-12 text-base font-semibold"
              disabled={!file}
            >
              Upload File
            </Button>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden" 
        onChange={handleFileChange}
        accept=".csv"
      />
    </div>
  );
} 
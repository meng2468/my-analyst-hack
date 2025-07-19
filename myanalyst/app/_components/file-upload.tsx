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
    <div className="w-full flex flex-col items-center gap-6">
      {/* Drag and Drop Area */}
      <div
        className={`w-full max-w-md h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-4 transition-colors ${
          isUploading ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
        } ${
          isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : uploadStatus === 'success'
            ? 'border-green-500 bg-green-50'
            : uploadStatus === 'error'
            ? 'border-red-500 bg-red-50'
            : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
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
            <div className="text-green-600 font-medium">✓ File uploaded successfully!</div>
            <div className="text-sm text-gray-600 mt-2">{file?.name}</div>
            <div className="text-xs text-gray-500">{(file?.size || 0 / 1024 / 1024).toFixed(2)} MB</div>
            {sessionId && (
              <div className="text-xs text-gray-400 mt-1">Session ID: {sessionId}</div>
            )}
            <Button 
              onClick={(e) => { e.stopPropagation(); resetUpload(); }}
              variant="outline" 
              size="sm" 
              className="mt-3"
            >
              Upload Another File
            </Button>
          </div>
        ) : uploadStatus === 'error' ? (
          <div className="text-center">
            <div className="text-red-600 font-medium">✗ Upload failed</div>
            <div className="text-sm text-gray-600 mt-2">{file?.name}</div>
            <div className="text-xs text-red-500 mt-1">{errorMessage}</div>
            <Button 
              onClick={(e) => { e.stopPropagation(); resetUpload(); }}
              variant="outline" 
              size="sm" 
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        ) : file ? (
          <div className="text-center">
            <div className="text-blue-600 font-medium">📁 File selected</div>
            <div className="text-sm text-gray-600 mt-2">{file.name}</div>
            <div className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            <div className="text-xs text-gray-400 mt-2">Click to choose a different file</div>
          </div>
        ) : (
          <>
            <div className="text-gray-400 text-4xl">📁</div>
            <div className="text-center">
              <div className="font-medium text-gray-700">
                {isDragOver ? 'Drop your file here' : 'Drag and drop your file here'}
              </div>
              <div className="text-sm text-gray-500 mt-1">or click to browse files</div>
            </div>
          </>
        )}
      </div>

      {/* Upload Button */}
      {file && !isUploading && uploadStatus === 'idle' && (
        <Button 
          onClick={uploadFile}
          className="w-full max-w-md"
          disabled={!file}
        >
          Upload File
        </Button>
      )}

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
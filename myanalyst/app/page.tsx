'use client'
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
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
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full h-full flex flex-col items-center gap-6 justify-center p-8">
      <h1 className="text-4xl font-bold">Welcome to MyAnalyst</h1>
      <div className="text-lg text-center">Drag and drop your dataset and start asking away!</div>
      
      {/* Drag and Drop Area */}
      <div
        className={`w-full max-w-md h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-4 transition-colors ${
          isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="text-center">
            <div className="text-green-600 font-medium">✓ File uploaded successfully!</div>
            <div className="text-sm text-gray-600 mt-2">{file.name}</div>
            <div className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
          </div>
        ) : (
          <>
            <div className="text-gray-400 text-4xl">📁</div>
            <div className="text-center">
              <div className="font-medium text-gray-700">
                {isDragOver ? 'Drop your file here' : 'Drag and drop your file here'}
              </div>
              <div className="text-sm text-gray-500 mt-1">or click the button below</div>
            </div>
          </>
        )}
      </div>

      {/* Upload Button */}
      <div>
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          onChange={handleFileChange} 
        />
        <Button size="lg" onClick={handleButtonClick}>
          {file ? 'Choose Different File' : 'Upload my dataset'}
        </Button>
      </div>
    </div>
  );
}

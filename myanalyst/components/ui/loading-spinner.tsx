import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`} />
  );
}

export function LoadingSpinnerWithText({ 
  text = 'Uploading...', 
  size = 'md',
  className = '' 
}: LoadingSpinnerProps & { text?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <LoadingSpinner size={size} />
      <p className="text-sm text-gray-600 animate-pulse">{text}</p>
    </div>
  );
} 
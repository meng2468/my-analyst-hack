'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface SummarySectionProps {
  onRestartWithNewDataset: () => void;
  onContinueWithSameDataset: () => void;
  sessionId: string;
}

export default function SummarySection({
  onRestartWithNewDataset,
  onContinueWithSameDataset,
  sessionId
}: SummarySectionProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:7860/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          email: email
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email summary');
      }

      const result = await response.json();
      console.log('Email summary sent successfully:', result);
      setEmail('');
      setEmailSent(true);
    } catch (error) {
      console.error('Failed to send email summary:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestartWithNewDataset = () => {
    onRestartWithNewDataset();
  };

  const handleContinueWithSameDataset = () => {
    onContinueWithSameDataset();
  };

  return (
    <div className="w-full h-[520px] flex flex-col items-center justify-center border bg-white/15 backdrop-blur-lg border-white rounded-lg relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full h-full flex flex-col justify-center p-8"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Summary Complete!</h2>
          <p className="text-white/80 text-lg">
            Your conversation summary has been generated. What would you like to do next?
          </p>
        </div>

        {/* Content - Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
          {/* Left Column - Email Summary */}
          <div className="space-y-6 flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-6">
              <Mail className="w-8 h-8 text-[#13FFAA]" />
              <h3 className="text-xl font-semibold text-white">Email Summary</h3>
            </div>
            <p className="text-white/70 text-base mb-6">
              Get your conversation summary delivered to your inbox
            </p>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#13FFAA] focus:ring-[#13FFAA]"
              />
              <Button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="w-full bg-[#13FFAA] text-black hover:bg-[#0FE099] h-12 text-base font-medium cursor-pointer"
              >
                {isSubmitting ? 'Sending...' : 'Generate Summary'}
              </Button>
            </form>
          </div>

          {/* Right Column - Restart Options */}
          <div className="space-y-6 flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-6">
              <RefreshCw className="w-8 h-8 text-[#13FFAA]" />
              <h3 className="text-xl font-semibold text-white">Continue Analysis</h3>
            </div>
            <p className="text-white/70 text-base mb-6">
              Upload a new dataset or continue with the same one
            </p>
            <div className="space-y-4">
              <Button
                onClick={handleRestartWithNewDataset}
                className="w-full bg-white text-gray-900 hover:bg-gray-100 h-12 text-base font-medium cursor-pointer"
              >
                Upload New Dataset
              </Button>
              <Button
                onClick={handleContinueWithSameDataset}
                className="w-full bg-white text-gray-900 hover:bg-gray-100 h-12 text-base font-medium cursor-pointer"
              >
                Continue with Same Dataset
              </Button>
            </div>
          </div>
        </div>
        
        {/* Confirmation Message */}
        {emailSent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex justify-center"
          >
            <div className="p-4 bg-[#13FFAA]/20 border border-[#13FFAA]/30 rounded-lg max-w-md">
              <p className="text-[#13FFAA] text-sm font-medium text-center">
                ✓ Summary sent successfully! Check your email.
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
} 
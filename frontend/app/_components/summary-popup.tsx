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
  const [activeOption, setActiveOption] = useState<'email' | 'restart' | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/report', {
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
      setActiveOption(null);
    } catch (error) {
      console.error('Failed to send email summary:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestartWithNewDataset = () => {
    onRestartWithNewDataset();
    setActiveOption(null);
  };

  const handleContinueWithSameDataset = () => {
    onContinueWithSameDataset();
    setActiveOption(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg border max-w-2xl w-full p-6 mx-auto"
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Summary Complete!</h2>
        <p className="text-gray-600 mt-2">
          Your conversation summary has been generated. What would you like to do next?
        </p>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Email Summary Option */}
        <div className="space-y-3">
          <Button
            variant={activeOption === 'email' ? 'default' : 'outline'}
            className="w-full justify-start h-auto p-4"
            onClick={() => setActiveOption(activeOption === 'email' ? null : 'email')}
          >
            <Mail className="w-5 h-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Email me a summary</div>
              <div className="text-sm text-gray-500">Get your conversation summary delivered to your inbox</div>
            </div>
          </Button>

          {activeOption === 'email' && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              onSubmit={handleEmailSubmit}
              className="space-y-3 pl-8"
            >
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="w-full"
              />
              <Button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="w-full"
              >
                {isSubmitting ? 'Sending...' : 'Generate Summary'}
              </Button>
            </motion.form>
          )}
        </div>

        {/* Restart/Continue Options */}
        <div className="space-y-3">
          <Button
            variant={activeOption === 'restart' ? 'default' : 'outline'}
            className="w-full justify-start h-auto p-4"
            onClick={() => setActiveOption(activeOption === 'restart' ? null : 'restart')}
          >
            <RefreshCw className="w-5 h-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Restart with another dataset</div>
              <div className="text-sm text-gray-500">Upload a new dataset and start fresh</div>
            </div>
          </Button>

          {activeOption === 'restart' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="space-y-3 pl-8"
            >
              <Button
                onClick={handleRestartWithNewDataset}
                variant="outline"
                className="w-full"
              >
                Upload New Dataset
              </Button>
              <Button
                onClick={handleContinueWithSameDataset}
                variant="outline"
                className="w-full"
              >
                Continue with Same Dataset
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
} 
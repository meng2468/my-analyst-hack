'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
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
  const [reportUrl, setReportUrl] = useState<string | null>(null);

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
      if (!response.ok) throw new Error('Failed to send email summary');

      const result = await response.json();
      setEmail('');
      setEmailSent(true);
      setReportUrl(result.report_url ?? null);
    } catch (error) {
      console.error('Failed to send email summary:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-[600px] flex flex-col items-center justify-center border bg-gradient-to-br from-[#1E293B]/90 to-[#0B1E23]/80 backdrop-blur-lg border-white/30 rounded-2xl shadow-lg relative">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full h-full flex flex-col justify-center p-8"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2 drop-shadow">
            🎉 Summary Complete!
          </h2>
          <p className="text-white/90 text-lg font-medium">
            Your conversation summary has been generated. What would you like to do next?
          </p>
        </div>

        {/* Two Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 flex-1">
          {/* Left Column - Email */}
          <div className="space-y-8 flex flex-col justify-center bg-white/10 rounded-xl p-6 shadow-inner">
            <div className="flex items-center gap-4 mb-2">
              <Mail className="w-8 h-8 text-[#13FFAA]" />
              <h3 className="text-[1.3rem] font-semibold text-white drop-shadow">Email Summary</h3>
            </div>
            <p className="text-white/75 text-base">
              Get your conversation summary delivered right to your inbox.
            </p>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="w-full bg-white/15 border-white/15 text-white placeholder:text-white/40 focus:border-[#13FFAA] focus:ring-[#13FFAA] rounded-lg"
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="w-full bg-[#13FFAA] text-black hover:bg-[#0FE099] h-12 text-base font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>Generate Report &amp; Send Email</>
                )}
              </Button>
            </form>
          </div>

          {/* Right Column - Restart */}
          <div className="space-y-8 flex flex-col justify-center bg-white/10 rounded-xl p-6 shadow-inner">
            <div className="flex items-center gap-4 mb-2">
              <RefreshCw className="w-8 h-8 text-[#13FFAA]" />
              <h3 className="text-[1.3rem] font-semibold text-white drop-shadow">Continue Analysis</h3>
            </div>
            <p className="text-white/75 text-base">
              Upload a new dataset or continue with your current one.
            </p>
            <div className="space-y-4">
              <Button
                onClick={onRestartWithNewDataset}
                className="w-full bg-white text-gray-900 hover:bg-gray-100 h-12 text-base font-semibold rounded-lg shadow-sm"
              >
                Upload New Dataset
              </Button>
              <Button
                onClick={onContinueWithSameDataset}
                className="w-full bg-white text-gray-900 hover:bg-gray-100 h-12 text-base font-semibold rounded-lg shadow-sm"
              >
                Continue with Same Dataset
              </Button>
            </div>
          </div>
        </div>

        {/* Confirmation Message */}
        {emailSent && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 flex flex-col items-center"
          >
            <div className="p-4 px-6 bg-gradient-to-r from-[#13FFAA]/80 to-[#0FE099]/70 border border-[#13FFAA]/50 rounded-xl shadow text-center flex flex-col items-center gap-1">
              <p className="text-white text-base font-medium">
                <span className="mr-2 text-lg">✅</span> Summary generated! Check your email for the report.
              </p>
              {reportUrl && (
                <Button
                  className="mt-3 bg-black/80 hover:bg-black/90 flex items-center gap-2 text-[#13FFAA] font-semibold border border-[#13FFAA]/60 shadow"
                  onClick={() => window.open(reportUrl, '_blank')}
                  title="Open your detailed report in a new tab"
                >
                  <ExternalLink className="w-4 h-4" /> View Report
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
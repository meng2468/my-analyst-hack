'use client'
import { FileUpload } from "@/app/_components/file-upload";
import { useEffect, useState } from "react";
import UploadView from "./_views/UploadView";
import ConversationView from "./_views/ConversationView";
import TranscriptView from "./_views/TranscriptView";
import SummaryPopup from "./_components/summary-popup";

/*
0: Upload dataset
1: Conversation Interaction
2: Summary
*/
export default function Home() {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string>(crypto.randomUUID());
  const [file, setFile] = useState<File | null>(null);
  const [showSummaryPopup, setShowSummaryPopup] = useState<boolean>(false);

  useEffect(() => {
    if (file) {
      setCurrentStep(1);
    }
  }, [file]);

  useEffect(() => {
    if (currentStep === 2) {
      setShowSummaryPopup(true);
    }
  }, [currentStep]);

  const handleRestartWithNewDataset = () => {
    setCurrentStep(0);
    setFile(null);
    setSessionId(crypto.randomUUID());
    setShowSummaryPopup(false);
  };

  const handleContinueWithSameDataset = () => {
    setCurrentStep(1);
    setShowSummaryPopup(false);
  };

  const handleCloseSummaryPopup = () => {
    setShowSummaryPopup(false);
  };

  return (
      <div className="w-full max-w-8xl mx-auto h-2/3 rounded-lg flex items-center justify-evenly backdrop-blur-sm">
        {currentStep !== 2 && (
          <>
            {currentStep === 1 && (
              <>
                <div className="rounded-l-xl h-full flex flex-col items-center justify-center mr-4">
                  <ConversationView
                    sessionId={sessionId}
                    step={currentStep}
                    setStep={setCurrentStep}
                    onStepChange={(newStep) => {
                      console.log('Step changed to:', newStep);
                      // Connection is already closed in ConversationView
                    }}
                  />
                </div>
              </>
            )}
            <div className="h-full w-full flex flex-col items-center justify-center ">
              {currentStep === 0 && (
                <UploadView sessionId={sessionId} setSessionFile={setFile} />
              )}
              {currentStep === 1 && (
                <TranscriptView sessionId={sessionId} setStep={setCurrentStep} />
              )}
            </div>
          </>
        )}

        {/* Summary Popup for Step 3 */}
        {
          showSummaryPopup && (
            <SummaryPopup
              onRestartWithNewDataset={handleRestartWithNewDataset}
              onContinueWithSameDataset={handleContinueWithSameDataset}
              sessionId={sessionId}
            />
          )
        }
      </div>
  );
}

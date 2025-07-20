'use client'
import { FileUpload } from "@/app/_components/file-upload";
import { useEffect, useState } from "react";
import UploadView from "./_views/UploadView";
import ConversationView from "./_views/ConversationView";
import TranscriptView from "./_views/TranscriptView";

/*
0: Upload dataset
1: Conversation Interaction
2: Summary
*/
export default function Home() {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string>(crypto.randomUUID());
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (file) {
      setCurrentStep(1);
    }
  }, [file]);

  return (
    <div className="w-full max-w-6xl mx-auto h-2/3 rounded-lg flex items-center justify-evenly p-8">
      {currentStep !== 2 && (
        <>
        {currentStep === 1 && (
          <>
          <div className="rounded-l-xl h-full flex flex-col items-center justify-center p-8">
            <ConversationView sessionId={sessionId} step={currentStep} setStep={setCurrentStep} />
          </div>
          </>
        )}
          <div className="h-full w-full flex flex-col items-center justify-center p-8 ">
            {currentStep === 0 && (
              <UploadView sessionId={sessionId} setSessionFile={setFile} />
            )}
            {currentStep === 1 && (
              <TranscriptView sessionId={sessionId} setStep={setCurrentStep}/>
            )}
          </div>
        </>
      )}
    </div>
  );
}

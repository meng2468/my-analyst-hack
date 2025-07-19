'use client'
import { FileUpload } from "@/app/_components/file-upload";
import { useEffect, useState } from "react";
import UploadView from "./_views/UploadView";
import ConversationView from "./_views/ConversationView";

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
    <div className="w-full max-w-xl mx-auto h-2/3 bg-white rounded-lg flex flex-col items-center justify-evenly p-8">
      <h1 className="text-4xl font-bold">Welcome to <span className="">MyAnalyst</span></h1>
      <div className="h-2/3 w-full flex flex-col items-center justify-center gap-6">
        {currentStep === 0 && (
          <UploadView sessionId={sessionId} setSessionFile={setFile} />
        )}
        {currentStep === 1 && (
          <ConversationView sessionId={sessionId}/>
        )}
        {currentStep === 2 && (
          <div className="text-sm text-gray-500">Summary</div>
        )}
      </div>
      <div className="text-sm text-gray-500">Session ID: {sessionId}</div>
    </div>
  );
}

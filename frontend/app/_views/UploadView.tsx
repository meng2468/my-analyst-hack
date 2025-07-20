import { FileUpload } from "@/app/_components/file-upload";

export default function UploadView({ sessionId, setSessionFile }: { sessionId: string, setSessionFile: (file: File) => void }) {
    return (
        <div className="w-full h-full flex flex-col items-center gap-6 justify-center p-8">
            <FileUpload sessionId={sessionId} setSessionFile={setSessionFile} />
        </div>
    )
}
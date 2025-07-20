import { FileUpload } from "@/app/_components/file-upload";

export default function UploadView({ sessionId, setSessionFile }: { sessionId: string, setSessionFile: (file: File) => void }) {
    return (
        <FileUpload sessionId={sessionId} setSessionFile={setSessionFile} />
    )
}
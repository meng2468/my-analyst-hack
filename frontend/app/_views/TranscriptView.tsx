import { RotateCcw, Download, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TranscriptView({ sessionId, setStep }: { sessionId: string, setStep: (step: number) => void }) {
    const exampleTranscript = [
        {
            "role": "user",
            "content": "Hello, how are you?"
        },
        {
            "role": "assistant",
            "content": "I'm doing well, thank you!"
        }
    ]

    const handleDownload = () => {
        // Dummy download functionality
        console.log('Download clicked')
    }

    const handleGenerateSummary = () => {
        setStep(3);
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-white p-4 rounded-lg relative">
            <div className="w-full h-full ">
                {exampleTranscript.map((message, index) => (
                    <div 
                        key={index} 
                        className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                        <div 
                            className={`text-lg p-4 rounded-md ${message.role === 'user' ? 'bg-white' : ''}`}
                        >
                            {message.content}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Floating buttons */}
            <div className="absolute bottom-4 right-4 flex gap-2">
                <Button
                    onClick={handleDownload}
                    size="icon"
                    variant="default"
                    className="rounded-full cursor-pointer"
                    title="Download"
                >
                    <Download size={20} />
                </Button>
                <Button
                    onClick={handleGenerateSummary}
                    size="icon"
                    variant="default"
                    className="rounded-full cursor-pointer"
                    title="Generate Summary"
                >
                    <Database size={20} />
                </Button>
                <Button
                    onClick={() => setStep(0)}
                    size="icon"
                    variant="secondary"
                    className="rounded-full cursor-pointer"
                    title="Restart"
                >
                    <RotateCcw size={20} />
                </Button>
            </div>
        </div>
    )
}
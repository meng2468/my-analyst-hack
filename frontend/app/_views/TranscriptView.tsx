export default function TranscriptView() {
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
    return (
        <div className="w-full h-full flex flex-col items-center justify-center ">
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
        </div>
    )
}
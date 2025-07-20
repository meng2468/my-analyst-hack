import React, { useEffect, useState, useRef } from 'react'
import { RotateCcw, Download, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AgentProgressView from './BackgroundAgent'

type MsgRole = 'user' | 'assistant' | 'data' | 'code' | 'image'

// Parse lines where role is determined by the line start, including "image:"
function parseLinesToMessages(lines: string[]) {
    const messages: { role: MsgRole, content: string }[] = []
    for (const line of lines) {
        // Accept "user:", "assistant:", "data:", "code:", or "image:"
        const match = line.match(/^(user|assistant|data|code|image):\s?(.*)$/i)
        if (match) {
            const role = match[1].toLowerCase() as MsgRole
            let content = match[2]
            // user/assistant: concatenate consecutive lines
            if (
                messages.length > 0 &&
                messages[messages.length - 1].role === role &&
                (role === 'user' || role === 'assistant')
            ) {
                messages[messages.length - 1].content += content
            } else {
                messages.push({ role, content })
            }
        }
    }
    return messages;
}

function renderWithLineBreaksFromString(text: string) {
    return text.split('\\n').map((line, idx, arr) =>
        idx < arr.length - 1 ? [line, <br key={idx} />] : line
    )
}

function CodeWithResult({ code, data }: { code: string; data: string }) {
    const [open, setOpen] = useState(false)
    const contentRef = useRef<HTMLDivElement>(null)
  
    return (
      <div className="my-2">
        {/* Only show card background when open */}
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 text-gray-700 hover:text-blue-600 text-sm px-2 py-1 transition focus:outline-none"
          >
            <span>Show code & result</span>
            <span className="text-gray-400">▼</span>
          </button>
        ) : (
          <div className="rounded-xl border border-gray-200 shadow overflow-hidden bg-white">
            <button
              onClick={() => setOpen(false)}
              className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 border-b border-gray-100 flex items-center transition"
              aria-expanded={open}
            >
              <span>Code & Result</span>
              <span className="ml-auto text-gray-400">▲</span>
            </button>
            {/* Animated content */}
            <div
              ref={contentRef}
              className="transition-all duration-300 ease-in-out overflow-hidden"
              style={{
                maxHeight: open
                  ? contentRef.current
                    ? contentRef.current.scrollHeight + 'px'
                    : '600px'
                  : '0px',
                opacity: open ? 1 : 0,
              }}
            >
              <div className="bg-gray-900 text-gray-100 p-3 font-mono text-xs border-b border-gray-800">
                <span className="uppercase text-[0.82em] tracking-wider text-gray-400 font-bold mb-2 block">Code</span>
                <pre className="overflow-x-auto whitespace-pre-wrap">
                  <code>{renderWithLineBreaksFromString(code)}</code>
                </pre>
              </div>
              <div className="bg-gray-50 text-gray-800 p-3 font-mono text-xs">
                <span className="uppercase text-[0.82em] tracking-wider text-gray-500 font-bold mb-2 block">Result</span>
                <pre className="overflow-x-auto whitespace-pre-wrap">
                  <code>{renderWithLineBreaksFromString(data)}</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
function ImageCard({ base64 }: { base64: string }) {
    return (
        <div className="w-full flex justify-center my-2">
            <div className="border border-gray-200 shadow rounded-lg bg-white p-2">
                <img
                    src={`data:image/png;base64,${base64}`}
                    alt="Result graph"
                    className="max-h-[300px] max-w-full rounded"
                />
            </div>
        </div>
    )
}

export default function TranscriptView({
    sessionId,
    setStep,
}: {
    sessionId: string
    setStep: (step: number) => void
}) {
    const [lines, setLines] = useState<string[]>([])
    const transcriptEndRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const url = `http://localhost:7860/api/transcript-events${sessionId ? `?session_id=${sessionId}` : ''
            }`
        const evtSource = new EventSource(url)
        evtSource.onmessage = (event) => {
            if (event.data.trim() !== '') {
                setLines((prev) => [...prev, event.data])
            }
        }
        evtSource.onerror = () => {
            evtSource.close()
        }
        return () => evtSource.close()
    }, [sessionId])

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [lines])

    const messages = parseLinesToMessages(lines)

    const renderedMessages: React.ReactNode[] = []
    for (let i = 0; i < messages.length; ++i) {
        const msg = messages[i]
        if (msg.role === 'code') {
            const next = messages[i + 1]
            if (next && next.role === 'data') {
                renderedMessages.push(
                    <CodeWithResult key={i} code={msg.content} data={next.content} />
                )
                i++ // skip next; it's used
                continue
            } else {
                renderedMessages.push(
                    <CodeWithResult key={i} code={msg.content} data="" />
                )
                continue
            }
        }
        if (msg.role === 'image') {
            renderedMessages.push(
                <ImageCard base64={msg.content} key={`img-${i}`} />
            )
            continue
        }
        if (msg.role === 'data' && (i === 0 || messages[i - 1].role !== 'code')) {
            // Standalone data not after code
            renderedMessages.push(
                <div
                    key={i}
                    className="bg-gray-200 text-gray-700 font-mono italic text-center w-full shadow-none rounded-lg px-4 py-3"
                    style={{ maxWidth: '100%' }}
                >
                    {renderWithLineBreaksFromString(msg.content)}
                </div>
            )
            continue
        }
        // user / assistant bubbles
        const justifyClass = msg.role === 'user' ? 'justify-end' : msg.role === 'assistant' ? 'justify-start' : 'justify-center';
        const messageClass = msg.role === 'user'
            ? 'bg-[#13FFAA] text-black self-end'
            : msg.role === 'assistant'
                ? 'bg-white border border-gray-200 text-gray-800'
                : '';

        renderedMessages.push(
            <div key={i} className={`flex ${justifyClass}`}>
                <div className={`rounded-lg px-4 py-3 max-w-[75%] whitespace-pre-line text-base shadow-sm ${messageClass}`}>
                    {renderWithLineBreaksFromString(msg.content)}
                </div>
            </div>
        );
    }

    const handleDownload = () => {
        const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `transcript-${sessionId || 'session'}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleGenerateSummary = () => setStep(3)

    return (
        <div className="w-full h-[520px] flex flex-col items-center justify-center border bg-white/15 backdrop-blur-lg border-white  rounded-lg relative">
            <div className="w-full flex-col items-start justify-center overflow-y-auto">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full w-full text-gray-400">
                        Waiting for transcript...
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 p-4 pr-6">
                        {renderedMessages}
                        <div ref={transcriptEndRef}></div>
                    </div>
                )}
            </div>
            <AgentProgressView sessionId={sessionId} totalRows={20} />

            {/* Floating Buttons */}
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
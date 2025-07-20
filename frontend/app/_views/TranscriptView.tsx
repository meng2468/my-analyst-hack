import React, { useEffect, useState, useRef } from 'react'
import { RotateCcw, Download, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AgentProgressView from './BackgroundAgent'

type MsgRole = 'user' | 'assistant' | 'data' | 'code'
function parseLinesToMessages(lines: string[]) {
    const messages: { role: MsgRole, content: string }[] = []
    for (const line of lines) {
      const match = line.match(/^(user|assistant|data|code):\s?(.*)$/i)
      if (match) {
        const role = match[1].toLowerCase() as MsgRole
        let content = match[2]
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
  
    // Replace \n with <br /> in all messages
    return messages;
  }

  function renderWithLineBreaksFromString(text: string) {
    return text.split('\\n').map((line, idx, arr) =>
      idx < arr.length - 1 ? [line, <br key={idx} />] : line
    )
  }
function CodeWithResult({ code, data }: { code: string; data: string }) {
  return (
    <div className="rounded-xl border border-gray-200 my-2 shadow overflow-hidden bg-white">
      <div className="bg-gray-900 text-gray-100 p-3 font-mono text-xs border-b border-gray-800">
        <span className="uppercase text-[0.82em] tracking-wider text-gray-400 font-bold mb-2 block">
          Code
        </span>
        <pre className="overflow-x-auto whitespace-pre-wrap">
        <code>{renderWithLineBreaksFromString(code)}</code>
        </pre>
      </div>
      <div className="bg-gray-50 text-gray-800 p-3 font-mono text-xs">
        <span className="uppercase text-[0.82em] tracking-wider text-gray-500 font-bold mb-2 block">
          Result
        </span>
        <pre className="overflow-x-auto whitespace-pre-wrap">
          <code>{renderWithLineBreaksFromString(data)}</code>
        </pre>
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
    const url = `http://localhost:7860/api/transcript-events${
      sessionId ? `?session_id=${sessionId}` : ''
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

  // Parse messages directly, no deduplication
  const messages = parseLinesToMessages(lines)

  // Handle code/data paring in the display logic
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
    renderedMessages.push(
      <div
        key={i}
        className={`flex ${
          msg.role === 'user'
            ? 'justify-end'
            : msg.role === 'assistant'
            ? 'justify-start'
            : 'justify-center'
        }`}
      >
        <div
          className={`
            rounded-lg px-4 py-3 max-w-[75%] whitespace-pre-line
            text-base shadow-sm
            ${
              msg.role === 'user'
                ? 'bg-blue-500 text-white self-end'
                : msg.role === 'assistant'
                ? 'bg-white border border-gray-200 text-gray-800'
                : ''
            }
          `}
        >
          {renderWithLineBreaksFromString(msg.content)}
        </div>
      </div>
    )
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
    <div className="w-full h-full flex flex-col items-center justify-center bg-white p-4 rounded-lg relative">
      <div
        className="
          w-full max-w-2xl flex-1
          bg-gray-50 rounded-lg border border-gray-100 shadow
          p-6
          mb-16
          overflow-y-auto
          max-h-[430px]
          transition-all"
        style={{ minHeight: '220px' }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full w-full text-gray-400">
            Waiting for transcript...
          </div>
        ) : (
          <div className="flex flex-col gap-3">
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
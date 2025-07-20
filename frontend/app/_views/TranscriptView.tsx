import React, { useEffect, useState, useRef } from 'react'
import { RotateCcw, Download, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AgentProgressView from './BackgroundAgent'

// Parses: "role: message"
function parseLinesToMessages(lines: string[]) {
  const messages: { role: 'user' | 'assistant', content: string }[] = []
  for (const line of lines) {
    const match = line.match(/^(user|assistant):\s?(.*)$/i)
    if (match) {
      const role = match[1].toLowerCase() as 'user' | 'assistant'
      const content = match[2]
      if (
        messages.length > 0 &&
        messages[messages.length - 1].role === role
      ) {
        messages[messages.length - 1].content += content
      } else {
        messages.push({ role, content })
      }
    }
  }
  return messages
}

// Remove exact consecutive duplicates
function dedupeMessages(msgs: {role: 'user'|'assistant', content: string}[]) {
  if (msgs.length <= 1) return msgs
  const deduped = [msgs[0]]
  for (let i = 1; i < msgs.length; ++i) {
    const prev = deduped[deduped.length - 1]
    const curr = msgs[i]
    if (
      curr.role === prev.role &&
      curr.content.trim() === prev.content.trim()
    ) {
      continue // skip duplicate
    }
    deduped.push(curr)
  }
  return deduped
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
    const url = `http://localhost:7860/api/transcript-events${sessionId ? `?session_id=${sessionId}` : ''}`
    const evtSource = new EventSource(url)
    evtSource.onmessage = event => {
        if (event.data.trim() !== '') {        // ignore empty/whitespace-only lines
            console.log('Transcript line:', event.data)
        }
        setLines(prev => [...prev, event.data])
    }
    evtSource.onerror = () => {
      evtSource.close()
    }
    return () => evtSource.close()
  }, [sessionId])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const messages = dedupeMessages(parseLinesToMessages(lines))

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
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`
                  flex
                  ${msg.role === 'user' ? 'justify-end' : 'justify-start'}
                `}
              >
                <div
                  className={`
                    rounded-lg px-4 py-3 max-w-[75%] whitespace-pre-line
                    text-base shadow-sm
                    ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white self-end'
                        : 'bg-white border border-gray-200 text-gray-800'
                    }
                  `}
                >
                  {msg.content}
                </div>
              </div>
            ))}
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
import React, { useEffect, useState, useCallback,useRef } from 'react'
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
  
    return (
      <div className="my-2">
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
            <div>
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
                <ExpandableImageCard base64={msg.content}  key={`img-${i}`}  expandOn="click" />
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

    const lastImageMsg = [...messages].reverse().find(m => m.role === "image");


type ExpandMode = "hover" | "click";

interface ExpandableImageCardProps {
    base64: string;
    expandOn?: ExpandMode;
}

function ExpandableImageCard({
    base64,
    expandOn = "hover",
  }: ExpandableImageCardProps) {
    const isDesktop = typeof window !== "undefined"
    ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
    : true;

  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expandOn !== "click" || !expanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expandOn, expanded]);

  // Use container hover state for "hover" mode
  if (expandOn === "hover" && isDesktop) {
    return (
      <div
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        style={{ display: "inline-block", position: "relative" }}
        tabIndex={0}
        title="Hover to expand"
      >
        <div
          className="transition-transform cursor-zoom-in hover:scale-105"
          style={{
            display: "flex",
            justifyContent: "center",
            position: "relative",
            zIndex: expanded ? 1 : "auto",
          }}
        >
          <img
            src={`data:image/png;base64,${base64}`}
            alt="Result graph"
            className="max-h-[260px] max-w-full rounded shadow-lg"
            draggable={false}
          />
        </div>
        {expanded && (
          <>
            <div
              className="fixed inset-0 bg-black bg-opacity-30 transition-opacity duration-100"
              style={{ pointerEvents: "none", zIndex: 9999 }}
              aria-hidden="true"
            />
            <div
              className="
                fixed flex items-center justify-center inset-0 transition-opacity duration-100 pointer-events-none
              "
              style={{ zIndex: 9999999 }}
            >
              <div
                className="bg-white rounded-xl shadow-2xl border border-gray-100 flex items-center justify-center"
                style={{
                  maxWidth: "90vw",
                  maxHeight: "80vh",
                  padding: 24,
                  pointerEvents: "none",
                }}
              >
                <img
                  src={`data:image/png;base64,${base64}`}
                  alt="Expanded result graph"
                  className="rounded-lg shadow-lg"
                  style={{
                    width: "auto",
                    height: "520px",
                    maxHeight: "70vh",
                    maxWidth: "80vw",
                    objectFit: "contain",
                  }}
                  draggable={false}
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // "Click" mode (or on non-desktop): use previous version
  return (
    <>
      <div
        className="transition-transform cursor-zoom-in hover:scale-105"
        style={{
          display: "flex",
          justifyContent: "center",
          position: "relative",
          zIndex: expanded ? 1 : "auto",
        }}
        onClick={() => setExpanded(true)}
        tabIndex={0}
        title="Click to expand"
        role="button"
      >
        <img
          src={`data:image/png;base64,${base64}`}
          alt="Result graph"
          className="max-h-[260px] max-w-full rounded shadow-lg"
          draggable={false}
        />
      </div>
      {expanded && isDesktop && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-30 transition-opacity duration-100"
            style={{ zIndex: 9999 }}
            aria-hidden="true"
            onClick={() => setExpanded(false)}
          />
          <div
            className="fixed flex items-center justify-center inset-0 transition-opacity duration-100"
            style={{ zIndex: 9999999, pointerEvents: "auto" }}
            onClick={() => setExpanded(false)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl border border-gray-100 flex items-center justify-center"
              style={{
                maxWidth: "90vw",
                maxHeight: "80vh",
                padding: 24,
                pointerEvents: "auto",
              }}
              onClick={e => e.stopPropagation()}
            >
              <img
                src={`data:image/png;base64,${base64}`}
                alt="Expanded result graph"
                className="rounded-lg shadow-lg"
                style={{
                  width: "auto",
                  height: "520px",
                  maxHeight: "70vh",
                  maxWidth: "80vw",
                  objectFit: "contain",
                }}
                draggable={false}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-white p-4 rounded-lg relative">
          <div className="flex w-full max-w-4xl gap-6 mx-auto">
            {/* Transcript area */}
            <div className="flex-1">
              <div
                className="
                  bg-gray-50 rounded-lg border border-gray-100 shadow
                  p-6 mb-16 overflow-y-auto max-h-[430px]
                  transition-all
                "
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
            
            </div>
      
            {/* --- Image column, shown only if an image exists and on desktop --- */}
            {lastImageMsg && (
            <aside className="hidden md:flex flex-col items-center mt-2 w-[320px] min-w-[240px] max-w-[340px]">
                <div className="sticky top-8 w-full">
                <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-4 flex flex-col items-center">
                    <span className="text-gray-500 text-xs font-semibold mb-2 tracking-wide">
                    Latest Graph/Chart
                    </span>
                    <ExpandableImageCard base64={lastImageMsg.content} expandOn="hover" />
                </div>
                </div>
            </aside>
            )}
          </div>
          {/* Floating Buttons (unchanged) */}
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
          <AgentProgressView sessionId={sessionId} totalRows={20} />
        </div>
      )
}
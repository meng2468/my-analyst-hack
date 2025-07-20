import React, { useEffect, useState } from 'react'

export default function AgentProgressView({
  sessionId,
  totalRows,
}: {
  sessionId: string
  totalRows?: number // Provide if you know total rows
}) {
  const [current, setCurrent] = useState(0)
  const [max, setMax] = useState(totalRows || 0)
  const [sheetUrl, setSheetUrl] = useState<string | null>(null)   // NEW

  // Listen to /api/enrichment-events
  useEffect(() => {
    const url = `http://localhost:7860/api/enrichment-events${sessionId ? `?session_id=${sessionId}` : ''}`
    const evtSource = new EventSource(url)
    evtSource.onmessage = event => {
      // Try to parse: Enriched row X/Y. View: <url>
      const m = event.data.match(/Enriched row (\d+)(?:\/(\d+))?(?:\. View: (https?:\/\/\S+))?/)
      if (m) {
        setCurrent(Number(m[1]))
        if (m[2]) setMax(Number(m[2]))
        if (m[3]) setSheetUrl(m[3])            // Captures URL if present
      }
    }
    evtSource.onerror = () => evtSource.close()
    return () => evtSource.close()
  }, [sessionId])

  // Calculate percent (avoid div by zero)
  const percent = max > 0 ? Math.min(100, (current / max) * 100) : 0
  if (current === 0) return null;
  
  return (
    <div className="w-full max-w-xl flex flex-col gap-3 items-center justify-center">
      <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
        <div
          className="bg-blue-500 h-4 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 font-medium">
        {max > 0
          ? <>Enriched: {current} / {max}{sheetUrl && (
              <> &middot; <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-600 hover:text-blue-800"
              >View live sheet</a></>
            )}
            </>
          : 'Enriching...'}
      </span>
    </div>
  )
}
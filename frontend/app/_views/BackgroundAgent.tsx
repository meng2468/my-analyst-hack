import React, { useEffect, useState } from 'react'

export default function AgentProgressView({
  sessionId,
  totalRows,
}: {
  sessionId: string
  totalRows?: number
}) {
  const [current, setCurrent] = useState(0)
  const [max, setMax] = useState(totalRows || 0)
  const [sheetUrl, setSheetUrl] = useState<string | null>(null)

  useEffect(() => {
    const url = `http://localhost:7860/api/enrichment-events${sessionId ? `?session_id=${sessionId}` : ''}`
    const evtSource = new EventSource(url)
    evtSource.onmessage = event => {
      const m = event.data.match(/Enriched row (\d+)(?:\/(\d+))?(?:\. View: (https?:\/\/\S+))?/)
      if (m) {
        setCurrent(Number(m[1]))
        if (m[2]) setMax(Number(m[2]))
        if (m[3]) setSheetUrl(m[3])
      }
    }
    evtSource.onerror = () => evtSource.close()
    return () => evtSource.close()
  }, [sessionId])

  const percent = max > 0 ? Math.min(100, (current / max) * 100) : 0
  if (current === 0) return null
  return (
    <div
      className={`
        bg-gray-50 rounded-lg border border-gray-100 shadow
        p-6 mt-0 w-full
      `}
      style={{ minHeight: 'unset', boxSizing: 'border-box' }}
    >
      <span className="font-semibold text-sm text-gray-700 mb-2 block">
        Background Agent Progress
      </span>
      <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
        <div
          className="bg-blue-500 h-4 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 font-medium mt-2 block text-center">
        {max > 0 ? (
          <>
            Enriched: {current} / {max}
            {sheetUrl && (
              <>
                {' '}•{' '}
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-600 hover:text-blue-800"
                >
                  View live sheet
                </a>
              </>
            )}
          </>
        ) : (
          'Enriching...'
        )}
      </span>
    </div>
  )
}
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
        bg-white rounded-2xl border border-gray-200 shadow-lg
        p-8 mt-5 w-full max-w-2xl mx-auto
        flex flex-col items-center
      `}
      style={{ minHeight: 'unset', boxSizing: 'border-box' }}
    >
      <span className="font-bold text-lg text-gray-700 mb-4 tracking-wide">
        Background Agent Progress
      </span>
      <div className="w-full bg-gray-200 h-8 rounded-full overflow-hidden mb-4">
        <div
          className="bg-blue-500 h-8 rounded-full transition-all duration-300"
          style={{
            width: `${percent}%`,
            minWidth: percent > 0 && percent < 8 ? '2rem' : undefined, // ensures a sliver shows
          }}
        />
      </div>
      <span className="text-base text-gray-600 font-medium mt-2 block text-center">
        {max > 0 ? (
          <>
            <span className="text-blue-700 font-semibold">
              Enriched: {current} / {max}
            </span>
            {sheetUrl && (
              <>
                {' '}<span className="mx-2 text-gray-400">•</span>{' '}
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-600 font-semibold hover:text-blue-800"
                  style={{ padding: '0.15rem 0.35rem' }}
                >
                  View live sheet
                </a>
              </>
            )}
          </>
        ) : (
          <span className="italic text-gray-500">Enriching...</span>
        )}
      </span>
    </div>
  )
}
'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'

export function DownloadButton({ assessmentId }: { assessmentId: string }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleDownload() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/assessment/download-pdf?id=${assessmentId}&type=client`)
      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'Financial_Summary.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setError('Download failed — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 w-full sm:w-auto bg-brand-700 hover:bg-brand-800 disabled:opacity-60 transition-colors text-white font-semibold text-sm rounded-xl border border-brand-500"
      >
        {loading
          ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</>
          : <><Download className="w-4 h-4" />Download My Summary PDF</>
        }
      </button>
      {error && <p className="text-red-300 text-xs mt-2 text-center">{error}</p>}
    </div>
  )
}

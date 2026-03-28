import { useState, useCallback, useRef } from 'react'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

async function renderPdfThumbnails(file) {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${(await import('pdfjs-dist')).version}/build/pdf.worker.min.mjs`
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  const thumbs = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 0.3 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    thumbs.push(canvas.toDataURL())
  }
  return { pdf, thumbs, numPages: pdf.numPages }
}

function parseRange(rangeStr, total) {
  const selected = new Set()
  const parts = rangeStr.split(',').map(s => s.trim()).filter(Boolean)
  for (const part of parts) {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number)
      for (let i = Math.max(1, a); i <= Math.min(total, b); i++) selected.add(i)
    } else {
      const n = Number(part)
      if (n >= 1 && n <= total) selected.add(n)
    }
  }
  return [...selected].sort((a, b) => a - b)
}

export default function PdfSplitter() {
  const [file, setFile] = useState(null)
  const [thumbs, setThumbs] = useState([])
  const [numPages, setNumPages] = useState(0)
  const [selected, setSelected] = useState(new Set())
  const [rangeStr, setRangeStr] = useState('')
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [useRange, setUseRange] = useState(false)
  const pdfRef = useRef(null)

  const handleFiles = useCallback(async (files) => {
    const f = files[0]
    if (!f || f.type !== 'application/pdf') return toast.error('Please upload a PDF file')
    setFile(f)
    setLoading(true)
    setThumbs([])
    setSelected(new Set())
    try {
      const { pdf, thumbs: t, numPages: n } = await renderPdfThumbnails(f)
      pdfRef.current = pdf
      setThumbs(t)
      setNumPages(n)
    } catch (err) {
      toast.error('Failed to load PDF: ' + err.message)
    }
    setLoading(false)
  }, [])

  const togglePage = (i) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const handleExtract = useCallback(async () => {
    const pages = useRange ? parseRange(rangeStr, numPages) : [...selected].sort((a, b) => a - b)
    if (!pages.length) return toast.error('Select at least one page')
    setProcessing(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const { PDFDocument } = await import('pdf-lib')
      const srcDoc = await PDFDocument.load(arrayBuffer)
      const newDoc = await PDFDocument.create()
      const copied = await newDoc.copyPages(srcDoc, pages.map(p => p - 1))
      copied.forEach(p => newDoc.addPage(p))
      const pdfBytes = await newDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `split_pages_${pages.join('-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`✅ Extracted ${pages.length} page${pages.length !== 1 ? 's' : ''} successfully!`)
    } catch (err) {
      toast.error('Failed to split PDF: ' + err.message)
    }
    setProcessing(false)
  }, [file, selected, useRange, rangeStr, numPages])

  return (
    <div className="animate-in">
      <PageHeader icon="✂️" iconClass="pdf" title="PDF Splitter" description="Extract specific pages from a PDF into a new file" />
      <div className="page-body">
        <div style={{ width: '100%', maxWidth: 900 }}>
          {!file ? (
            <FileDropzone accept="application/pdf" onFiles={handleFiles} label="Drop a PDF here or" hint="Select pages to extract" />
          ) : (
            <>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{numPages} pages</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setThumbs([]); setSelected(new Set()) }}>Change</button>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">Page Selection Mode</div>
                <div className="tabs" style={{ marginBottom: 12 }}>
                  <button className={`tab ${!useRange ? 'active' : ''}`} onClick={() => setUseRange(false)}>Click to Select</button>
                  <button className={`tab ${useRange ? 'active' : ''}`} onClick={() => setUseRange(true)}>Range Input</button>
                </div>
                {useRange && (
                  <div className="form-group">
                    <label className="form-label">Page Range (e.g. 1,3,5-8)</label>
                    <input type="text" className="form-input" placeholder="1,3,5-8" value={rangeStr} onChange={e => setRangeStr(e.target.value)} />
                  </div>
                )}
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}><div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading pages...</div>
              ) : (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div className="flex-between" style={{ marginBottom: 12 }}>
                    <div className="card-title" style={{ margin: 0 }}>{numPages} Pages</div>
                    {!useRange && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set(Array.from({ length: numPages }, (_, i) => i + 1)))}>Select All</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 }}>
                    {thumbs.map((src, i) => (
                      <div
                        key={i}
                        onClick={() => !useRange && togglePage(i + 1)}
                        style={{
                          cursor: useRange ? 'default' : 'pointer',
                          border: `2px solid ${selected.has(i + 1) ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          transition: 'border-color 0.15s',
                          position: 'relative',
                          background: selected.has(i + 1) ? 'var(--accent-subtle)' : 'var(--bg-primary)',
                        }}
                      >
                        <img src={src} alt={`Page ${i + 1}`} style={{ width: '100%', display: 'block' }} />
                        <div style={{ textAlign: 'center', fontSize: 11, padding: '4px 0', color: selected.has(i + 1) ? 'var(--accent)' : 'var(--text-muted)', fontWeight: selected.has(i + 1) ? 700 : 400 }}>
                          Page {i + 1}
                        </div>
                        {selected.has(i + 1) && (
                          <div style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white' }}>✓</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleExtract} disabled={processing || loading}>
                {processing ? <><div className="spinner" /> Extracting...</> : `✂️ Extract ${useRange ? 'Selected Range' : `${selected.size} Page${selected.size !== 1 ? 's' : ''}`}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

async function loadPdfThumbs(file) {
  const { getDocument, GlobalWorkerOptions, version } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  const thumbs = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 0.28 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    thumbs.push(canvas.toDataURL())
  }
  return thumbs
}

export default function PdfPageReorder() {
  const [file, setFile] = useState(null)
  const [thumbs, setThumbs] = useState([])
  const [order, setOrder] = useState([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  const handleFiles = useCallback(async (files) => {
    const f = files[0]
    if (!f || f.type !== 'application/pdf') return toast.error('Please upload a PDF file')
    setFile(f)
    setLoading(true)
    try {
      const t = await loadPdfThumbs(f)
      setThumbs(t)
      setOrder(t.map((_, i) => i))
    } catch (err) {
      toast.error('Failed to load PDF: ' + err.message)
    }
    setLoading(false)
  }, [])

  const handleDragStart = (i) => setDragIdx(i)
  const handleDragOver = (e, i) => { e.preventDefault(); setDragOverIdx(i) }
  const handleDrop = (e, i) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return }
    setOrder(prev => {
      const next = [...prev]
      const [removed] = next.splice(dragIdx, 1)
      next.splice(i, 0, removed)
      return next
    })
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const handleSave = useCallback(async () => {
    if (!file || !order.length) return
    setProcessing(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const { PDFDocument } = await import('pdf-lib')
      const srcDoc = await PDFDocument.load(arrayBuffer)
      const newDoc = await PDFDocument.create()
      const copied = await newDoc.copyPages(srcDoc, order)
      copied.forEach(p => newDoc.addPage(p))
      const pdfBytes = await newDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'reordered_' + file.name
      a.click()
      URL.revokeObjectURL(url)
      toast.success('✅ Reordered PDF downloaded!')
    } catch (err) {
      toast.error('Failed to reorder PDF: ' + err.message)
    }
    setProcessing(false)
  }, [file, order])

  return (
    <div className="animate-in">
      <PageHeader icon="↕️" iconClass="pdf" title="PDF Page Reorder" description="Drag and drop to rearrange PDF pages" />
      <div className="page-body">
        <div style={{ width: '100%', maxWidth: 900 }}>
          {!file ? (
            <FileDropzone accept="application/pdf" onFiles={handleFiles} label="Drop a PDF here or" hint="Drag pages to reorder them" />
          ) : (
            <>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{order.length} pages — drag to reorder</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setOrder(order.map((_, i) => i))}>Reset Order</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setThumbs([]); setOrder([]) }}>Change</button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}><div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading pages...</div>
              ) : (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>🖱️ Drag cards to reorder pages</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12 }}>
                    {order.map((origIdx, i) => (
                      <div
                        key={`${origIdx}-${i}`}
                        draggable
                        onDragStart={() => handleDragStart(i)}
                        onDragOver={(e) => handleDragOver(e, i)}
                        onDrop={(e) => handleDrop(e, i)}
                        onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                        style={{
                          border: `2px solid ${dragOverIdx === i ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          cursor: 'grab',
                          background: dragIdx === i ? 'var(--accent-subtle)' : 'var(--bg-primary)',
                          opacity: dragIdx === i ? 0.5 : 1,
                          transition: 'border-color 0.1s, opacity 0.1s',
                          transform: dragOverIdx === i ? 'scale(1.03)' : 'scale(1)',
                        }}
                      >
                        <img src={thumbs[origIdx]} alt={`Page ${origIdx + 1}`} style={{ width: '100%', display: 'block', pointerEvents: 'none' }} />
                        <div style={{ textAlign: 'center', fontSize: 11, padding: '4px 0', color: 'var(--text-muted)' }}>
                          Pg {origIdx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleSave} disabled={processing || loading}>
                {processing ? <><div className="spinner" /> Saving...</> : '⬇ Download Reordered PDF'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

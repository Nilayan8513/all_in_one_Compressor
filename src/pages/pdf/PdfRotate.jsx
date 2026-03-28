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

const ROT_OPTIONS = [0, 90, 180, 270]

export default function PdfRotate() {
  const [file, setFile] = useState(null)
  const [thumbs, setThumbs] = useState([])
  const [rotations, setRotations] = useState([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)

  const handleFiles = useCallback(async (files) => {
    const f = files[0]
    if (!f || f.type !== 'application/pdf') return toast.error('Please upload a PDF file')
    setFile(f)
    setLoading(true)
    try {
      const t = await loadPdfThumbs(f)
      setThumbs(t)
      setRotations(new Array(t.length).fill(0))
    } catch (err) {
      toast.error('Failed to load PDF: ' + err.message)
    }
    setLoading(false)
  }, [])

  const setPageRot = (i, deg) => {
    setRotations(prev => { const next = [...prev]; next[i] = deg; return next })
  }

  const rotateAll = (deg) => {
    setRotations(prev => prev.map(() => deg))
  }

  const handleSave = useCallback(async () => {
    if (!file) return
    setProcessing(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const { PDFDocument, degrees } = await import('pdf-lib')
      const doc = await PDFDocument.load(arrayBuffer)
      doc.getPages().forEach((page, i) => {
        if (rotations[i] !== 0) {
          page.setRotation(degrees(rotations[i]))
        }
      })
      const pdfBytes = await doc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'rotated_' + file.name
      a.click()
      URL.revokeObjectURL(url)
      toast.success('✅ Rotated PDF downloaded!')
    } catch (err) {
      toast.error('Failed: ' + err.message)
    }
    setProcessing(false)
  }, [file, rotations])

  return (
    <div className="animate-in">
      <PageHeader icon="🔄" iconClass="pdf" title="PDF Rotate" description="Rotate individual or all pages of a PDF" />
      <div className="page-body">
        <div style={{ width: '100%', maxWidth: 900 }}>
          {!file ? (
            <FileDropzone accept="application/pdf" onFiles={handleFiles} label="Drop a PDF here or" hint="Rotate pages individually or all at once" />
          ) : (
            <>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="flex-between">
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setThumbs([]); setRotations([]) }}>Change</button>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">Rotate All Pages</div>
                <div className="tabs">
                  {ROT_OPTIONS.map(deg => (
                    <button key={deg} className="tab" onClick={() => rotateAll(deg)}>{deg}°</button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}><div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading pages...</div>
              ) : (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div className="card-title" style={{ marginBottom: 12 }}>Per-Page Rotation</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
                    {thumbs.map((src, i) => (
                      <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-primary)' }}>
                        <div style={{ overflow: 'hidden', position: 'relative', height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
                          <img
                            src={src}
                            alt={`Page ${i + 1}`}
                            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', transform: `rotate(${rotations[i] || 0}deg)`, transition: 'transform 0.3s' }}
                          />
                        </div>
                        <div style={{ padding: '6px 8px' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textAlign: 'center' }}>Page {i + 1}</div>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            {[90, 180, 270].map(deg => (
                              <button
                                key={deg}
                                onClick={() => setPageRot(i, rotations[i] === deg ? 0 : deg)}
                                style={{
                                  padding: '2px 6px', borderRadius: 4, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid var(--border)',
                                  background: rotations[i] === deg ? 'var(--accent)' : 'var(--bg-primary)',
                                  color: rotations[i] === deg ? 'white' : 'var(--text-secondary)',
                                  transition: 'all 0.15s'
                                }}
                              >{deg}°</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleSave} disabled={processing || loading}>
                {processing ? <><div className="spinner" /> Saving...</> : '⬇ Download Rotated PDF'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

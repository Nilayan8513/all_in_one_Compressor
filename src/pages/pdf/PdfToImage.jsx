import { useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const FORMAT_OPTIONS = ['png', 'jpeg', 'webp']

const QUALITY_PRESETS = [
  {
    label: 'Draft',
    description: 'Fast export, small files',
    dpi: 72,
    quality: 0.6,
    badge: '~150 KB/page',
    badgeColor: '#22c55e',
  },
  {
    label: 'Standard',
    description: 'Good for screen viewing',
    dpi: 150,
    quality: 0.8,
    badge: '~500 KB/page',
    badgeColor: '#3b82f6',
  },
  {
    label: 'High',
    description: 'Sharp text & graphics',
    dpi: 300,
    quality: 0.92,
    badge: '~2 MB/page',
    badgeColor: '#f59e0b',
  },
  {
    label: 'Ultra',
    description: 'Print-ready, maximum detail',
    dpi: 600,
    quality: 1.0,
    badge: '~8 MB/page',
    badgeColor: '#ef4444',
  },
]

export default function PdfToImage() {
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(1) // Standard by default
  const [format, setFormat] = useState('png')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedImages, setGeneratedImages] = useState([])

  const preset = QUALITY_PRESETS[selectedPresetIdx]

  const handleFiles = useCallback(async (files) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setGeneratedImages([])
    try {
      const buffer = await f.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      setPageCount(pdf.numPages)
    } catch (err) {
      console.error('Failed to load PDF:', err)
    }
  }, [])

  const handleConvert = useCallback(async () => {
    if (!file) return
    setProcessing(true)
    setProgress(0)
    setGeneratedImages([])

    try {
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      const images = []
      const scale = preset.dpi / 72

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')

        await page.render({ canvasContext: ctx, viewport }).promise

        const mimeType = `image/${format}`
        const qualityValue = format === 'png' ? undefined : preset.quality
        const dataUrl = canvas.toDataURL(mimeType, qualityValue)

        // Calculate actual file size from data URL
        const base64 = dataUrl.split(',')[1]
        const sizeBytes = Math.round((base64.length * 3) / 4)
        const sizeLabel = sizeBytes > 1024 * 1024
          ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(sizeBytes / 1024)} KB`

        images.push({
          dataUrl,
          page: i,
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
          size: sizeLabel,
        })
        setProgress(Math.round((i / pdf.numPages) * 100))
      }

      setGeneratedImages(images)
    } catch (err) {
      console.error('Conversion failed:', err)
    }
    setProcessing(false)
  }, [file, preset, format])

  const downloadImage = (img) => {
    const a = document.createElement('a')
    a.href = img.dataUrl
    a.download = `page_${img.page}.${format}`
    a.click()
  }

  const downloadAll = async () => {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    for (const img of generatedImages) {
      const data = img.dataUrl.split(',')[1]
      zip.file(`page_${img.page}.${format}`, data, { base64: true })
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${file.name}_images.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="animate-in">
      <PageHeader
        icon="🖼️"
        iconClass="pdf"
        title="PDF → Image"
        description="Convert PDF pages to high-quality images"
      />
      <div className="page-body">
        {!file ? (
          <FileDropzone
            accept="application/pdf"
            onFiles={handleFiles}
            label="Drop a PDF here or"
            hint="Each page will be converted to an image"
          />
        ) : (
          <div style={{ maxWidth: 700, width: '100%', margin: '0 auto' }}>
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="flex-between">
                <div>
                  <div className="card-title" style={{ margin: 0 }}>{file.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                    {pageCount} page{pageCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setGeneratedImages([]) }}>Change</button>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Output Format</div>
              <div className="card-section">
                <div className="tabs">
                  {FORMAT_OPTIONS.map(f => (
                    <button key={f} className={`tab ${format === f ? 'active' : ''}`} onClick={() => setFormat(f)}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Image Quality</div>
              <div className="card-section">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {QUALITY_PRESETS.map((p, idx) => {
                    const isSelected = selectedPresetIdx === idx
                    // Calculate expected dimensions for an A4 page
                    const expectedW = Math.round((595.28 / 72) * p.dpi)
                    const expectedH = Math.round((841.89 / 72) * p.dpi)
                    return (
                      <button
                        key={p.label}
                        onClick={() => setSelectedPresetIdx(idx)}
                        style={{
                          display: 'flex', flexDirection: 'column', gap: 4,
                          padding: '14px 16px',
                          borderRadius: 12,
                          border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                          background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface-alt)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: isSelected ? 'var(--accent-light)' : 'var(--text-primary)' }}>
                            {p.label}
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            padding: '2px 8px', borderRadius: 6,
                            background: `${p.badgeColor}20`, color: p.badgeColor,
                          }}>
                            {p.badge}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {p.description}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {p.dpi} DPI · {expectedW} × {expectedH}px
                          {format !== 'png' && ` · ${Math.round(p.quality * 100)}% quality`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {processing && (
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="flex-between" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>Converting...</span>
                  <span style={{ fontSize: 14, color: 'var(--accent-light)' }}>{progress}%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {generatedImages.length === 0 && (
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={handleConvert}
                disabled={processing}
              >
                {processing ? <><div className="spinner" /> Converting...</> : `Convert ${pageCount} Pages`}
              </button>
            )}

            {generatedImages.length > 0 && (
              <div>
                <div className="flex-between" style={{ marginBottom: 16 }}>
                  <span style={{ fontWeight: 600 }}>{generatedImages.length} images generated</span>
                  <button className="btn btn-primary btn-sm" onClick={downloadAll}>
                    ⬇ Download ZIP
                  </button>
                </div>
                <div className="grid-3">
                  {generatedImages.map(img => (
                    <div key={img.page} className="card" style={{ padding: 12, cursor: 'pointer' }} onClick={() => downloadImage(img)}>
                      <img src={img.dataUrl} alt={`Page ${img.page}`} style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />
                      <div style={{ fontSize: 13, textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Page {img.page}
                      </div>
                      <div style={{ fontSize: 11, textAlign: 'center', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>
                        {img.width}×{img.height} · {img.size}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { PDFDocument } from 'pdf-lib'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

const MARGIN_PRESETS = [
  { label: 'Small', value: 20 },
  { label: 'Medium', value: 40 },
  { label: 'Large', value: 60 },
]

export default function ImageToPdf() {
  const [images, setImages] = useState([]) // [{file, url, id}]
  const [useMargin, setUseMargin] = useState(false)
  const [margin, setMargin] = useState(20)
  const [fitToPage, setFitToPage] = useState(true)
  const [processing, setProcessing] = useState(false)

  const handleFiles = useCallback((files) => {
    const entries = files.map(f => ({
      file: f,
      url: URL.createObjectURL(f),
      id: Date.now() + Math.random(),
      name: f.name,
    }))
    setImages(prev => [...prev, ...entries])
  }, [])

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id))
  }

  const moveImage = (index, direction) => {
    setImages(prev => {
      const next = [...prev]
      const newIndex = index + direction
      if (newIndex < 0 || newIndex >= next.length) return prev
      ;[next[index], next[newIndex]] = [next[newIndex], next[index]]
      return next
    })
  }

  const handleConvert = useCallback(async () => {
    if (images.length === 0) return
    setProcessing(true)

    try {
      const pdf = await PDFDocument.create()
      const effectiveMargin = useMargin ? margin : 0

      for (const img of images) {
        const buffer = await img.file.arrayBuffer()
        const uint8 = new Uint8Array(buffer)

        let embeddedImg
        if (img.file.type === 'image/png') {
          embeddedImg = await pdf.embedPng(uint8)
        } else {
          embeddedImg = await pdf.embedJpg(uint8)
        }

        const imgW = embeddedImg.width
        const imgH = embeddedImg.height

        if (fitToPage) {
          // A4 size
          const pageW = 595.28
          const pageH = 841.89
          const page = pdf.addPage([pageW, pageH])

          const availW = pageW - effectiveMargin * 2
          const availH = pageH - effectiveMargin * 2
          const scale = Math.min(availW / imgW, availH / imgH)
          const drawW = imgW * scale
          const drawH = imgH * scale
          const x = (pageW - drawW) / 2
          const y = (pageH - drawH) / 2

          page.drawImage(embeddedImg, { x, y, width: drawW, height: drawH })
        } else {
          // Actual image size — page matches image + margin
          const pageW = imgW + effectiveMargin * 2
          const pageH = imgH + effectiveMargin * 2
          const page = pdf.addPage([pageW, pageH])
          page.drawImage(embeddedImg, { x: effectiveMargin, y: effectiveMargin, width: imgW, height: imgH })
        }
      }

      const pdfBytes = await pdf.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'images_compiled.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Conversion failed:', err)
    }
    setProcessing(false)
  }, [images, margin, useMargin, fitToPage])

  return (
    <div className="animate-in">
      <PageHeader
        icon="📄"
        iconClass="pdf"
        title="Image → PDF"
        description="Compile images into a PDF document"
      />
      <div className="page-body">
        <div style={{ maxWidth: 700, width: '100%', margin: '0 auto' }}>
          <FileDropzone
            accept="image/jpeg,image/png"
            multiple
            onFiles={handleFiles}
            label="Drop images here or"
            hint="Supports JPG and PNG — drag to reorder after upload"
            maxSize={10 * 1024 * 1024}
          />

          {images.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div className="flex-between" style={{ marginBottom: 16 }}>
                <span style={{ fontWeight: 600 }}>{images.length} image{images.length !== 1 ? 's' : ''}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setImages([])}>Clear All</button>
              </div>

              <div className="file-list" style={{ marginBottom: 24 }}>
                {images.map((img, i) => (
                  <div key={img.id} className="file-item">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 20, fontSize: 10 }} onClick={() => moveImage(i, -1)} disabled={i === 0}>▲</button>
                      <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 20, fontSize: 10 }} onClick={() => moveImage(i, 1)} disabled={i === images.length - 1}>▼</button>
                    </div>
                    <img src={img.url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                    <div className="file-item-info">
                      <div className="file-item-name">{img.name}</div>
                    </div>
                    <button className="file-item-remove" onClick={() => removeImage(img.id)}>✕</button>
                  </div>
                ))}
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">Page Layout</div>
                <div className="card-section">
                  <div className="form-group">
                    <label className="form-label">Page Sizing</label>
                    <div className="tabs">
                      <button className={`tab ${fitToPage ? 'active' : ''}`} onClick={() => setFitToPage(true)}>
                        Fit to A4
                      </button>
                      <button className={`tab ${!fitToPage ? 'active' : ''}`} onClick={() => setFitToPage(false)}>
                        Actual Image Size
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                      {fitToPage
                        ? 'Images will be scaled to fit A4 pages (595 × 842 pt)'
                        : 'Each page will match the exact pixel dimensions of the image'
                      }
                    </div>
                  </div>
                </div>

                <div className="card-section">
                  <div className="form-group">
                    <label className="form-label">Margin</label>
                    <div className="presets-row">
                      <button
                        className={`preset-chip ${!useMargin ? 'active' : ''}`}
                        onClick={() => setUseMargin(false)}
                      >
                        No Margin
                      </button>
                      {MARGIN_PRESETS.map(m => (
                        <button
                          key={m.value}
                          className={`preset-chip ${useMargin && margin === m.value ? 'active' : ''}`}
                          onClick={() => { setUseMargin(true); setMargin(m.value) }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                      {!useMargin
                        ? 'Images will fill the entire page with no spacing'
                        : `${margin}pt margin around each image`
                      }
                    </div>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={handleConvert}
                disabled={processing}
              >
                {processing ? <><div className="spinner" /> Building PDF...</> : '⬇ Download PDF'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

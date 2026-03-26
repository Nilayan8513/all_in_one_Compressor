import { useState, useRef, useCallback, useEffect } from 'react'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

const DPI_PRESETS = [
  { label: 'Web', value: 72 },
  { label: 'Print', value: 150 },
  { label: 'High Print', value: 300 },
  { label: 'Professional', value: 600 },
]

const FORMAT_OPTIONS = ['jpg', 'png', 'webp']

export default function ImageCompressor() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [originalDimensions, setOriginalDimensions] = useState({ w: 0, h: 0 })
  const [dpi, setDpi] = useState(72)
  const [format, setFormat] = useState('jpg')
  const [quality, setQuality] = useState(85)
  const [processing, setProcessing] = useState(false)
  const [realEstimatedSize, setRealEstimatedSize] = useState(null)
  const [estimating, setEstimating] = useState(false)
  const estimateTimerRef = useRef(null)

  const handleFiles = useCallback((files) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
    const img = new Image()
    img.onload = () => setOriginalDimensions({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = url
  }, [])

  const updateEstimatedSize = useCallback(async () => {
    if (!preview) return
    setEstimating(true)
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = preview })
      const canvas = document.createElement('canvas')
      canvas.width = originalDimensions.w
      canvas.height = originalDimensions.h
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp'
      const qualityVal = format === 'png' ? undefined : quality / 100
      const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, qualityVal))
      if (blob) setRealEstimatedSize(blob.size)
    } catch (err) { console.error(err) }
    setEstimating(false)
  }, [preview, originalDimensions, format, quality])

  useEffect(() => {
    if (!preview) return
    if (estimateTimerRef.current) clearTimeout(estimateTimerRef.current)
    estimateTimerRef.current = setTimeout(() => updateEstimatedSize(), 400)
    return () => { if (estimateTimerRef.current) clearTimeout(estimateTimerRef.current) }
  }, [updateEstimatedSize])

  const formatBytes = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const sizeColor = () => {
    if (!realEstimatedSize || !file) return ''
    const ratio = realEstimatedSize / file.size
    if (ratio <= 0.5) return 'green'
    if (ratio <= 1.5) return 'yellow'
    return 'red'
  }

  const handleExport = useCallback(async () => {
    if (!preview) return
    setProcessing(true)
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = preview })
      const canvas = document.createElement('canvas')
      canvas.width = originalDimensions.w
      canvas.height = originalDimensions.h
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp'
      const qualityVal = format === 'png' ? undefined : quality / 100
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `compressed_${dpi}dpi.${format}`
        a.click()
        URL.revokeObjectURL(url)
        setProcessing(false)
      }, mimeType, qualityVal)
    } catch (err) {
      console.error(err)
      setProcessing(false)
    }
  }, [preview, originalDimensions, dpi, format, quality])

  return (
    <div className="animate-in">
      <PageHeader
        icon="📦"
        iconClass="image"
        title="Image Compressor"
        description="Compress images with DPI and quality control"
      />
      <div className="page-body">
        {!file ? (
          <FileDropzone
            accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
            onFiles={handleFiles}
            label="Drop an image here or"
            hint="Supports JPG, PNG, WEBP, BMP, TIFF"
            maxSize={10 * 1024 * 1024}
          />
        ) : (
          <div className="tool-layout">
            {/* Left: Preview */}
            <div className="tool-panel sticky">
              <div className="card">
                <div className="flex-between" style={{ marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {originalDimensions.w} × {originalDimensions.h} px · {formatBytes(file.size)}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setPreview(null) }}>Change</button>
                </div>
                <div className="preview-panel">
                  <img src={preview} alt="Preview" />
                </div>
                {realEstimatedSize && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Estimated: </span>
                    <span className={`size-indicator ${sizeColor()}`} style={{ fontSize: 14 }}>{formatBytes(realEstimatedSize)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Controls */}
            <div className="tool-panel">
              {/* DPI */}
              <div className="card">
                <div className="card-title">DPI / Resolution</div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label">DPI: {dpi}</label>
                  <input type="range" className="range-slider" min="72" max="600" step="1" value={dpi} onChange={(e) => setDpi(Number(e.target.value))} />
                </div>
                <div className="presets-row">
                  {DPI_PRESETS.map(p => (
                    <button key={p.value} className={`preset-chip ${dpi === p.value ? 'active' : ''}`} onClick={() => setDpi(p.value)}>
                      {p.label} ({p.value})
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality */}
              <div className="card">
                <div className="card-title">Quality & Compression</div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <div className="flex-between" style={{ marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0 }}>Quality: {quality}%</label>
                    <span className={`badge ${quality >= 80 ? 'badge-success' : quality >= 50 ? 'badge-info' : quality >= 25 ? 'badge-warning' : 'badge-danger'}`}>
                      {quality >= 80 ? 'High' : quality >= 50 ? 'Medium' : quality >= 25 ? 'Low' : 'Very Low'}
                    </span>
                  </div>
                  <input type="range" className="range-slider" min="1" max="100" value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
                  <div className="flex-between" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    <span>Smallest file</span><span>Best quality</span>
                  </div>
                </div>
                <div className="presets-row">
                  {[{ label: 'Low', val: 25 }, { label: 'Medium', val: 50 }, { label: 'Good', val: 75 }, { label: 'High', val: 90 }, { label: 'Max', val: 100 }].map(p => (
                    <button key={p.val} className={`preset-chip ${quality === p.val ? 'active' : ''}`} onClick={() => setQuality(p.val)}>
                      {p.label} ({p.val}%)
                    </button>
                  ))}
                </div>
              </div>

              {/* Format & Export */}
              <div className="card">
                <div className="card-title">Export Format</div>
                <div className="tabs" style={{ marginBottom: 12 }}>
                  {FORMAT_OPTIONS.map(f => (
                    <button key={f} className={`tab ${format === f ? 'active' : ''}`} onClick={() => setFormat(f)}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleExport} disabled={processing}>
                  {processing ? <><div className="spinner" /> Compressing...</> : '⬇ Export Compressed Image'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

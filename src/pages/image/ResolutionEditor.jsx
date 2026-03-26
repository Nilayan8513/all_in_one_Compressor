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

const UNIT_OPTIONS = [
  { label: 'px', value: 'px' },
  { label: 'cm', value: 'cm' },
  { label: 'mm', value: 'mm' },
  { label: 'in', value: 'in' },
]

export default function ResolutionEditor() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [originalDimensions, setOriginalDimensions] = useState({ w: 0, h: 0 })
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [dpi, setDpi] = useState(72)
  const [lockAspect, setLockAspect] = useState(true)
  const [format, setFormat] = useState('jpg')
  const [quality, setQuality] = useState(85)
  const [processing, setProcessing] = useState(false)
  const [realEstimatedSize, setRealEstimatedSize] = useState(null)
  const [estimating, setEstimating] = useState(false)
  const [unit, setUnit] = useState('px')
  const aspectRatio = useRef(1)
  const estimateTimerRef = useRef(null)

  // Conversion helpers
  const pxToUnit = (px, u) => {
    if (u === 'cm') return (px / dpi) * 2.54
    if (u === 'mm') return (px / dpi) * 25.4
    if (u === 'in') return px / dpi
    return px
  }

  const unitToPx = (val, u) => {
    if (u === 'cm') return Math.round((val / 2.54) * dpi)
    if (u === 'mm') return Math.round((val / 25.4) * dpi)
    if (u === 'in') return Math.round(val * dpi)
    return Math.round(val)
  }

  const displayW = unit === 'px' ? width : pxToUnit(width, unit)
  const displayH = unit === 'px' ? height : pxToUnit(height, unit)
  const decimals = unit === 'px' ? 0 : unit === 'mm' ? 1 : 2

  const handleFiles = useCallback((files) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)

    const img = new Image()
    img.onload = () => {
      setOriginalDimensions({ w: img.naturalWidth, h: img.naturalHeight })
      setWidth(img.naturalWidth)
      setHeight(img.naturalHeight)
      aspectRatio.current = img.naturalWidth / img.naturalHeight
    }
    img.src = url
  }, [])

  const handleWidthInput = (val) => {
    const v = parseFloat(val) || 0
    const px = Math.max(1, unitToPx(v, unit))
    setWidth(px)
    if (lockAspect) {
      setHeight(Math.round(px / aspectRatio.current))
    }
  }

  const handleHeightInput = (val) => {
    const v = parseFloat(val) || 0
    const px = Math.max(1, unitToPx(v, unit))
    setHeight(px)
    if (lockAspect) {
      setWidth(Math.round(px * aspectRatio.current))
    }
  }

  // Recalculate pixels when DPI changes (for physical units)
  useEffect(() => {
    if (unit !== 'px' && width > 0 && height > 0) {
      // Keep physical dimensions, recalculate pixels
    }
  }, [dpi])

  // Real-time estimated size
  const updateEstimatedSize = useCallback(async () => {
    if (!preview) return
    setEstimating(true)
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = preview
      })
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)
      const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp'
      const qualityVal = format === 'png' ? undefined : quality / 100
      const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, qualityVal))
      if (blob) setRealEstimatedSize(blob.size)
    } catch (err) {
      console.error('Size estimation failed:', err)
    }
    setEstimating(false)
  }, [preview, width, height, format, quality])

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
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = preview
      })
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)
      const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp'
      const qualityVal = format === 'png' ? undefined : quality / 100
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `compressed_${width}x${height}_${dpi}dpi.${format}`
        a.click()
        URL.revokeObjectURL(url)
        setProcessing(false)
      }, mimeType, qualityVal)
    } catch (err) {
      console.error('Export failed:', err)
      setProcessing(false)
    }
  }, [preview, width, height, dpi, format, quality])

  return (
    <div className="animate-in">
      <PageHeader
        icon="🖼️"
        iconClass="image"
        title="Image Compressor"
        description="Resize, compress, and convert images with precise dimension control"
      />
      <div className="page-body">
        {!file ? (
          <FileDropzone
            accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
            onFiles={handleFiles}
            label="Drop an image here or"
            hint="Supports JPG, PNG, WEBP, BMP, TIFF"
          />
        ) : (
          <div style={{ maxWidth: 700, width: '100%', margin: '0 auto' }}>
            {/* File info + Preview */}
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="flex-between" style={{ marginBottom: 10 }}>
                <div className="flex-row">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {originalDimensions.w} × {originalDimensions.h} px · {formatBytes(file.size)}
                    </div>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setPreview(null) }}>Change</button>
              </div>
              <div className="preview-panel">
                <img src={preview} alt="Preview" />
              </div>
            </div>

            {/* DPI */}
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">DPI / Resolution</div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">DPI Value: {dpi}</label>
                <input
                  type="range"
                  className="range-slider"
                  min="72"
                  max="600"
                  step="1"
                  value={dpi}
                  onChange={(e) => setDpi(Number(e.target.value))}
                />
              </div>
              <div className="presets-row">
                {DPI_PRESETS.map(p => (
                  <button
                    key={p.value}
                    className={`preset-chip ${dpi === p.value ? 'active' : ''}`}
                    onClick={() => setDpi(p.value)}
                  >
                    {p.label} ({p.value})
                  </button>
                ))}
              </div>
            </div>

            {/* Dimensions with unit switcher */}
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="card-title" style={{ margin: 0 }}>Dimensions</span>
                <div className="flex-row" style={{ gap: 6 }}>
                  <div
                    className={`toggle ${lockAspect ? 'active' : ''}`}
                    onClick={() => setLockAspect(!lockAspect)}
                    title={lockAspect ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {lockAspect ? '🔒' : '🔓'}
                  </span>
                </div>
              </div>

              {/* Unit selector tabs */}
              <div className="tabs" style={{ marginBottom: 12 }}>
                {UNIT_OPTIONS.map(u => (
                  <button
                    key={u.value}
                    className={`tab ${unit === u.value ? 'active' : ''}`}
                    onClick={() => setUnit(u.value)}
                  >
                    {u.label}
                  </button>
                ))}
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Width ({unit})</label>
                  <input
                    type="number"
                    className="form-input"
                    value={unit === 'px' ? displayW : displayW.toFixed(decimals)}
                    onChange={(e) => handleWidthInput(e.target.value)}
                    min="0"
                    step={unit === 'px' ? '1' : '0.01'}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Height ({unit})</label>
                  <input
                    type="number"
                    className="form-input"
                    value={unit === 'px' ? displayH : displayH.toFixed(decimals)}
                    onChange={(e) => handleHeightInput(e.target.value)}
                    min="0"
                    step={unit === 'px' ? '1' : '0.01'}
                  />
                </div>
              </div>

              {/* Show all conversions */}
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{width} × {height}</div>
                  <div style={{ color: 'var(--text-muted)' }}>px</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{((width / dpi) * 2.54).toFixed(1)} × {((height / dpi) * 2.54).toFixed(1)}</div>
                  <div style={{ color: 'var(--text-muted)' }}>cm</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{((width / dpi) * 25.4).toFixed(0)} × {((height / dpi) * 25.4).toFixed(0)}</div>
                  <div style={{ color: 'var(--text-muted)' }}>mm</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{(width / dpi).toFixed(2)} × {(height / dpi).toFixed(2)}</div>
                  <div style={{ color: 'var(--text-muted)' }}>in</div>
                </div>
              </div>
            </div>

            {/* Quality & Compression */}
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Quality & Compression</div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <div className="flex-between" style={{ marginBottom: 4 }}>
                  <label className="form-label" style={{ margin: 0 }}>Quality: {quality}%</label>
                  <span className={`badge ${quality >= 80 ? 'badge-success' : quality >= 50 ? 'badge-info' : quality >= 25 ? 'badge-warning' : 'badge-danger'}`}>
                    {quality >= 80 ? 'High' : quality >= 50 ? 'Medium' : quality >= 25 ? 'Low' : 'Very Low'}
                  </span>
                </div>
                <input
                  type="range"
                  className="range-slider"
                  min="1"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                />
                <div className="flex-between" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  <span>Smallest file</span>
                  <span>Best quality</span>
                </div>
              </div>
              <div className="presets-row" style={{ marginBottom: 10 }}>
                {[{ label: 'Low', val: 25 }, { label: 'Medium', val: 50 }, { label: 'Good', val: 75 }, { label: 'High', val: 90 }, { label: 'Max', val: 100 }].map(p => (
                  <button
                    key={p.val}
                    className={`preset-chip ${quality === p.val ? 'active' : ''}`}
                    onClick={() => setQuality(p.val)}
                  >
                    {p.label} ({p.val}%)
                  </button>
                ))}
              </div>
              {realEstimatedSize && (
                <div style={{ padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Estimated: </span>
                  <span className={`size-indicator ${sizeColor()}`} style={{ fontSize: 14 }}>{formatBytes(realEstimatedSize)}</span>
                </div>
              )}
            </div>

            {/* Format & Export */}
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Export Format</div>
              <div className="tabs" style={{ marginBottom: 12 }}>
                {FORMAT_OPTIONS.map(f => (
                  <button
                    key={f}
                    className={`tab ${format === f ? 'active' : ''}`}
                    onClick={() => setFormat(f)}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={handleExport}
                disabled={processing}
              >
                {processing ? <><div className="spinner" /> Processing...</> : `⬇ Export Image`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

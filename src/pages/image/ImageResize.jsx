import { useState, useRef, useCallback } from 'react'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

const UNIT_OPTIONS = [
  { label: 'px', value: 'px' },
  { label: 'cm', value: 'cm' },
  { label: 'mm', value: 'mm' },
  { label: 'in', value: 'in' },
]

const FORMAT_OPTIONS = ['jpg', 'png', 'webp']

export default function ImageResize() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [originalDimensions, setOriginalDimensions] = useState({ w: 0, h: 0 })
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [dpi, setDpi] = useState(72)
  const [lockAspect, setLockAspect] = useState(true)
  const [unit, setUnit] = useState('px')
  const [format, setFormat] = useState('jpg')
  const [processing, setProcessing] = useState(false)
  const aspectRatio = useRef(1)

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
    if (lockAspect) setHeight(Math.round(px / aspectRatio.current))
  }

  const handleHeightInput = (val) => {
    const v = parseFloat(val) || 0
    const px = Math.max(1, unitToPx(v, unit))
    setHeight(px)
    if (lockAspect) setWidth(Math.round(px * aspectRatio.current))
  }

  const handleExport = useCallback(async () => {
    if (!preview) return
    setProcessing(true)
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = preview })
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)
      const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp'
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `resized_${width}x${height}.${format}`
        a.click()
        URL.revokeObjectURL(url)
        setProcessing(false)
      }, mimeType)
    } catch (err) {
      console.error(err)
      setProcessing(false)
    }
  }, [preview, width, height, format])

  return (
    <div className="animate-in">
      <PageHeader
        icon="📐"
        iconClass="image"
        title="Image Resize"
        description="Resize images with precise dimensions in px, cm, mm, or inches"
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
          <div className="tool-layout">
            {/* Left: Preview */}
            <div className="tool-panel sticky">
              <div className="card">
                <div className="flex-between" style={{ marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Original: {originalDimensions.w} × {originalDimensions.h} px
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setPreview(null) }}>Change</button>
                </div>
                <div className="preview-panel">
                  <img src={preview} alt="Preview" />
                </div>
                {/* All conversions */}
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, fontSize: 11 }}>
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
            </div>

            {/* Right: Controls */}
            <div className="tool-panel">
              {/* DPI */}
              <div className="card">
                <div className="flex-between">
                  <span className="card-title" style={{ margin: 0 }}>Reference DPI</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{dpi}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Used for cm/mm/in conversions</div>
                <input type="range" className="range-slider" min="72" max="600" step="1" value={dpi} onChange={(e) => setDpi(Number(e.target.value))} />
              </div>

              {/* Dimensions */}
              <div className="card">
                <div className="flex-between" style={{ marginBottom: 8 }}>
                  <span className="card-title" style={{ margin: 0 }}>Dimensions</span>
                  <div className="flex-row" style={{ gap: 6 }}>
                    <div
                      className={`toggle ${lockAspect ? 'active' : ''}`}
                      onClick={() => setLockAspect(!lockAspect)}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {lockAspect ? '🔒 Locked' : '🔓 Free'}
                    </span>
                  </div>
                </div>

                <div className="tabs" style={{ marginBottom: 12 }}>
                  {UNIT_OPTIONS.map(u => (
                    <button key={u.value} className={`tab ${unit === u.value ? 'active' : ''}`} onClick={() => setUnit(u.value)}>
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
              </div>

              {/* Export */}
              <div className="card">
                <div className="card-title">Export</div>
                <div className="tabs" style={{ marginBottom: 12 }}>
                  {FORMAT_OPTIONS.map(f => (
                    <button key={f} className={`tab ${format === f ? 'active' : ''}`} onClick={() => setFormat(f)}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleExport} disabled={processing}>
                  {processing ? <><div className="spinner" /> Resizing...</> : `⬇ Export Resized Image (${width}×${height})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

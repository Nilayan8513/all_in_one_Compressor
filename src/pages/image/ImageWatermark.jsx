import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

const POSITIONS = [
  { label: '↖', value: 'top-left' }, { label: '↑', value: 'top-center' }, { label: '↗', value: 'top-right' },
  { label: '←', value: 'mid-left' }, { label: '✛', value: 'mid-center' }, { label: '→', value: 'mid-right' },
  { label: '↙', value: 'bot-left' }, { label: '↓', value: 'bot-center' }, { label: '↘', value: 'bot-right' },
]

export default function ImageWatermark() {
  const [file, setFile] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [text, setText] = useState('© My Watermark')
  const [fontSize, setFontSize] = useState(36)
  const [color, setColor] = useState('#ffffff')
  const [opacity, setOpacity] = useState(70)
  const [position, setPosition] = useState('bot-right')
  const [mode, setMode] = useState('text') // 'text' | 'logo'
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const logoRef = useRef(null)

  const handleFiles = useCallback((files) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    const img = new Image()
    img.onload = () => { imgRef.current = img; drawWatermark() }
    img.src = URL.createObjectURL(f)
  }, [])

  const handleLogoFiles = useCallback((files) => {
    const f = files[0]
    if (!f) return
    setLogoFile(f)
    const img = new Image()
    img.onload = () => { logoRef.current = img }
    img.src = URL.createObjectURL(f)
  }, [])

  const getPos = (cw, ch, region) => {
    const pad = 20
    const positions = {
      'top-left': [pad, pad, 'left', 'top'],
      'top-center': [cw / 2, pad, 'center', 'top'],
      'top-right': [cw - pad, pad, 'right', 'top'],
      'mid-left': [pad, ch / 2, 'left', 'middle'],
      'mid-center': [cw / 2, ch / 2, 'center', 'middle'],
      'mid-right': [cw - pad, ch / 2, 'right', 'middle'],
      'bot-left': [pad, ch - pad, 'left', 'bottom'],
      'bot-center': [cw / 2, ch - pad, 'center', 'bottom'],
      'bot-right': [cw - pad, ch - pad, 'right', 'bottom'],
    }
    return positions[region] || positions['bot-right']
  }

  const drawWatermark = useCallback(() => {
    const img = imgRef.current
    if (!img || !canvasRef.current) return
    const canvas = canvasRef.current
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    ctx.globalAlpha = opacity / 100

    const [x, y, align, baseline] = getPos(canvas.width, canvas.height, position)

    if (mode === 'text') {
      ctx.font = `bold ${fontSize}px Inter, sans-serif`
      ctx.fillStyle = color
      ctx.textAlign = align
      ctx.textBaseline = baseline
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 4
      ctx.fillText(text, x, y)
    } else if (mode === 'logo' && logoRef.current) {
      const logo = logoRef.current
      const maxW = canvas.width * 0.2
      const scale = Math.min(maxW / logo.naturalWidth, 1)
      const lw = logo.naturalWidth * scale
      const lh = logo.naturalHeight * scale
      const lx = align === 'right' ? x - lw : align === 'center' ? x - lw / 2 : x
      const ly = baseline === 'bottom' ? y - lh : baseline === 'middle' ? y - lh / 2 : y
      ctx.drawImage(logo, lx, ly, lw, lh)
    }
    ctx.globalAlpha = 1
  }, [text, fontSize, color, opacity, position, mode])

  useEffect(() => { drawWatermark() }, [drawWatermark])

  const handleDownload = () => {
    if (!canvasRef.current || !file) return
    canvasRef.current.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'watermarked_' + file.name
      a.click()
      URL.revokeObjectURL(url)
      toast.success('✅ Watermarked image downloaded!')
    }, 'image/png')
  }

  return (
    <div className="animate-in">
      <PageHeader icon="💧" iconClass="image" title="Image Watermark" description="Add text or logo watermarks with live preview" />
      <div className="page-body">
        <div style={{ width: '100%', maxWidth: 900 }}>
          {!file ? (
            <FileDropzone accept="image/*" onFiles={handleFiles} label="Drop an image here or" hint="JPG, PNG, WebP" />
          ) : (
            <div className="tool-layout">
              <div className="tool-panel sticky">
                <div className="card">
                  <div className="flex-between" style={{ marginBottom: 10 }}>
                    <div className="card-title" style={{ margin: 0 }}>Live Preview</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); imgRef.current = null }}>Change</button>
                  </div>
                  <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                </div>
              </div>
              <div className="tool-panel">
                <div className="card">
                  <div className="card-title">Watermark Type</div>
                  <div className="tabs">
                    <button className={`tab ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>📝 Text</button>
                    <button className={`tab ${mode === 'logo' ? 'active' : ''}`} onClick={() => setMode('logo')}>🖼 Logo</button>
                  </div>
                </div>

                {mode === 'text' ? (
                  <div className="card">
                    <div className="card-title">Text Settings</div>
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <label className="form-label">Watermark Text</label>
                      <input type="text" className="form-input" value={text} onChange={e => setText(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Font Size: {fontSize}px</label>
                        <input type="range" className="range-slider" min="12" max="120" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Color</label>
                        <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 48, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card">
                    <div className="card-title">Logo Image</div>
                    <FileDropzone accept="image/*" onFiles={handleLogoFiles} label="Drop logo here or" hint="PNG with transparency recommended" />
                  </div>
                )}

                <div className="card">
                  <div className="card-title">Opacity: {opacity}%</div>
                  <input type="range" className="range-slider" min="10" max="100" value={opacity} onChange={e => setOpacity(Number(e.target.value))} />
                </div>

                <div className="card">
                  <div className="card-title">Position</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 42px)', gap: 6 }}>
                    {POSITIONS.map(p => (
                      <button
                        key={p.value}
                        onClick={() => setPosition(p.value)}
                        style={{
                          width: 42, height: 42, borderRadius: 8, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit',
                          background: position === p.value ? 'var(--accent)' : 'var(--bg-primary)',
                          color: position === p.value ? 'white' : 'var(--text-secondary)',
                          border: `1px solid ${position === p.value ? 'var(--accent)' : 'var(--border)'}`,
                          transition: 'all 0.15s'
                        }}
                      >{p.label}</button>
                    ))}
                  </div>
                </div>

                <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleDownload}>
                  ⬇ Download Watermarked Image
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

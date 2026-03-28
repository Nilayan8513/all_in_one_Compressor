import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'

const SIZES = [128, 192, 256, 384, 512]

export default function QrCodeGenerator() {
  const [text, setText] = useState('https://example.com')
  const [size, setSize] = useState(256)
  const [fgColor, setFgColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!text.trim()) return
    let cancelled = false
    const generate = async () => {
      try {
        const QRCode = (await import('qrcode')).default
        const canvas = canvasRef.current
        if (!canvas || cancelled) return
        await QRCode.toCanvas(canvas, text, {
          width: size,
          color: { dark: fgColor, light: bgColor },
          margin: 2,
        })
      } catch {
        // silently ignore
      }
    }
    const timer = setTimeout(generate, 200)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [text, size, fgColor, bgColor])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'qrcode.png'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('✅ QR Code downloaded!')
    }, 'image/png')
  }

  return (
    <div className="animate-in">
      <PageHeader icon="⊞" iconClass="image" title="QR Code Generator" description="Generate QR codes from any text or URL instantly" />
      <div className="page-body">
        <div style={{ width: '100%', maxWidth: 700 }}>
          <div className="tool-layout">
            <div className="tool-panel sticky">
              <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
                {text.trim() ? (
                  <canvas ref={canvasRef} style={{ borderRadius: 'var(--radius-sm)', maxWidth: '100%' }} />
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Enter text to generate QR code</div>
                )}
              </div>
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleDownload} disabled={!text.trim()}>
                ⬇ Download PNG
              </button>
            </div>

            <div className="tool-panel">
              <div className="card">
                <div className="card-title">Content</div>
                <div className="form-group">
                  <label className="form-label">Text or URL</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="https://example.com or any text..."
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="card">
                <div className="card-title">Size</div>
                <div className="presets-row" style={{ flexWrap: 'wrap' }}>
                  {SIZES.map(s => (
                    <button key={s} className={`preset-chip ${size === s ? 'active' : ''}`} onClick={() => setSize(s)}>{s}px</button>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-title">Colors</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Foreground</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} style={{ width: 40, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
                      <input type="text" className="form-input" value={fgColor} onChange={e => setFgColor(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 13 }} />
                    </div>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Background</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ width: 40, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
                      <input type="text" className="form-input" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 13 }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

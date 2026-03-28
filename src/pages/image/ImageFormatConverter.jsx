import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const FORMATS = [
  { value: 'jpg', mime: 'image/jpeg', label: 'JPG' },
  { value: 'png', mime: 'image/png', label: 'PNG' },
  { value: 'webp', mime: 'image/webp', label: 'WebP' },
  { value: 'avif', mime: 'image/avif', label: 'AVIF' },
]

export default function ImageFormatConverter() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [targetFormat, setTargetFormat] = useState('webp')
  const [quality, setQuality] = useState(85)
  const [outputSize, setOutputSize] = useState(null)
  const [processing, setProcessing] = useState(false)

  const handleFiles = useCallback((files) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setOutputSize(null)
  }, [])

  const convert = useCallback(async () => {
    if (!file || !preview) return
    setProcessing(true)
    try {
      const fmt = FORMATS.find(f => f.value === targetFormat)
      const img = await new Promise((res, rej) => {
        const i = new Image()
        i.onload = () => res(i)
        i.onerror = rej
        i.src = preview
      })
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      const qualityVal = targetFormat === 'png' ? undefined : quality / 100
      const blob = await new Promise(res => canvas.toBlob(res, fmt.mime, qualityVal))
      setOutputSize(blob.size)
      const savings = Math.round((1 - blob.size / file.size) * 100)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name.replace(/\.[^.]+$/, '') + '.' + targetFormat
      a.click()
      URL.revokeObjectURL(url)
      if (blob.size < file.size) {
        toast.success(`✅ Saved ${formatBytes(file.size - blob.size)} (${savings}% smaller)`)
      } else {
        toast('Converted! Output is slightly larger than original.', { icon: '⚠️' })
      }
    } catch (err) {
      toast.error('Conversion failed: ' + err.message)
    }
    setProcessing(false)
  }, [file, preview, targetFormat, quality])

  return (
    <div className="animate-in">
      <PageHeader icon="🔀" iconClass="image" title="Image Format Converter" description="Convert between JPG, PNG, WebP, and AVIF formats" />
      <div className="page-body">
        <div style={{ width: '100%', maxWidth: 700 }}>
          {!file ? (
            <FileDropzone accept="image/*" onFiles={handleFiles} label="Drop an image here or" hint="Supports JPG, PNG, WebP, GIF, BMP" />
          ) : (
            <>
              <div className="tool-layout">
                <div className="tool-panel sticky">
                  <div className="card">
                    <div className="flex-between" style={{ marginBottom: 10 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setPreview(null); setOutputSize(null) }}>Change</button>
                    </div>
                    <div className="preview-panel"><img src={preview} alt="Preview" /></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13, padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Original</span>
                      <span style={{ fontWeight: 600 }}>{formatBytes(file.size)}</span>
                    </div>
                    {outputSize && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 13, padding: '8px 12px', background: 'var(--accent-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-accent)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Converted</span>
                        <span style={{ fontWeight: 600, color: outputSize < file.size ? '#22c55e' : '#f87171' }}>{formatBytes(outputSize)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="tool-panel">
                  <div className="card">
                    <div className="card-title">Target Format</div>
                    <div className="tabs" style={{ flexWrap: 'wrap' }}>
                      {FORMATS.map(f => (
                        <button key={f.value} className={`tab ${targetFormat === f.value ? 'active' : ''}`} onClick={() => setTargetFormat(f.value)}>{f.label}</button>
                      ))}
                    </div>
                    {targetFormat === 'avif' && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', padding: '6px 10px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                        ⓘ AVIF support varies by browser. Chrome/Edge recommended.
                      </div>
                    )}
                  </div>
                  {targetFormat !== 'png' && (
                    <div className="card">
                      <div className="card-title">Quality: {quality}%</div>
                      <input type="range" className="range-slider" min="1" max="100" value={quality} onChange={e => setQuality(Number(e.target.value))} />
                      <div className="flex-between" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                        <span>Smallest file</span><span>Best quality</span>
                      </div>
                    </div>
                  )}
                  {outputSize && (
                    <div className={`stats-banner ${outputSize < file.size ? 'stats-banner-success' : 'stats-banner-warn'}`}>
                      {outputSize < file.size
                        ? `✅ Saved ${formatBytes(file.size - outputSize)} (${Math.round((1 - outputSize / file.size) * 100)}% reduction)`
                        : `⚠️ Output is larger than original — try lower quality`}
                    </div>
                  )}
                  <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={convert} disabled={processing}>
                    {processing ? <><div className="spinner" /> Converting...</> : `Convert to ${targetFormat.toUpperCase()} & Download`}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

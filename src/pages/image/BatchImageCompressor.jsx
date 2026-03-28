import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'
import { useZipDownload } from '../../hooks/useZipDownload'

const FORMAT_OPTIONS = ['jpg', 'png', 'webp']

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function BatchImageCompressor() {
  const [files, setFiles] = useState([])
  const [quality, setQuality] = useState(80)
  const [format, setFormat] = useState('jpg')
  const [results, setResults] = useState([])
  const [processing, setProcessing] = useState(false)
  const { downloadZip } = useZipDownload()

  const handleFiles = useCallback((newFiles) => {
    const images = Array.from(newFiles).filter(f => f.type.startsWith('image/'))
    setFiles(prev => [...prev, ...images])
    setResults([])
  }, [])

  const compressAll = useCallback(async () => {
    if (!files.length) return
    setProcessing(true)
    const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp'
    const qualityVal = format === 'png' ? undefined : quality / 100
    const out = []
    for (const file of files) {
      try {
        const img = await new Promise((res, rej) => {
          const i = new Image()
          i.onload = () => res(i)
          i.onerror = rej
          i.src = URL.createObjectURL(file)
        })
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const blob = await new Promise(res => canvas.toBlob(res, mimeType, qualityVal))
        out.push({ name: file.name, originalSize: file.size, compressedSize: blob.size, blob, format })
      } catch {
        out.push({ name: file.name, originalSize: file.size, compressedSize: null, error: true })
      }
    }
    setResults(out)
    setProcessing(false)
    const saved = out.reduce((a, r) => a + (r.compressedSize ? r.originalSize - r.compressedSize : 0), 0)
    if (saved > 0) {
      toast.success(`✅ Saved ${formatBytes(saved)} total across ${out.length} images`)
    } else {
      toast('Processing complete', { icon: '📦' })
    }
  }, [files, quality, format])

  const downloadAll = useCallback(async () => {
    if (!results.length) return
    const zipFiles = results
      .filter(r => r.blob)
      .map(r => ({
        filename: r.name.replace(/\.[^.]+$/, '') + '.' + r.format,
        blob: r.blob
      }))
    try {
      await downloadZip(zipFiles, 'compressed_images.zip')
      toast.success('✅ ZIP downloaded!')
    } catch {
      toast.error('Failed to create ZIP')
    }
  }, [results, downloadZip])

  const totalOriginal = results.reduce((a, r) => a + r.originalSize, 0)
  const totalCompressed = results.reduce((a, r) => a + (r.compressedSize || 0), 0)
  const savings = totalOriginal > 0 ? Math.round((1 - totalCompressed / totalOriginal) * 100) : 0

  return (
    <div className="animate-in">
      <PageHeader icon="📦" iconClass="image" title="Batch Image Compressor" description="Compress multiple images at once and download as ZIP" />
      <div className="page-body">
        <div style={{ width: '100%', maxWidth: 760 }}>
          <FileDropzone
            accept="image/jpeg,image/png,image/webp,image/bmp"
            onFiles={handleFiles}
            label="Drop images here or"
            hint="Supports JPG, PNG, WebP, BMP — multiple files"
            multiple
          />
          {files.length > 0 && (
            <>
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-title">Settings</div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                    <label className="form-label">Quality: {quality}%</label>
                    <input type="range" className="range-slider" min="10" max="100" value={quality} onChange={e => setQuality(Number(e.target.value))} />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                    <label className="form-label">Output Format</label>
                    <div className="tabs">
                      {FORMAT_OPTIONS.map(f => (
                        <button key={f} className={`tab ${format === f ? 'active' : ''}`} onClick={() => setFormat(f)}>{f.toUpperCase()}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginTop: 12 }}>
                <div className="flex-between" style={{ marginBottom: 10 }}>
                  <div className="card-title" style={{ margin: 0 }}>{files.length} file{files.length !== 1 ? 's' : ''} selected</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setFiles([]); setResults([]) }}>Clear All</button>
                </div>
                {files.map((f, i) => {
                  const r = results[i]
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{f.name}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{formatBytes(f.size)}</span>
                        {r && r.compressedSize && (
                          <>
                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                            <span style={{ color: r.compressedSize < f.size ? '#22c55e' : '#f87171', fontWeight: 600 }}>{formatBytes(r.compressedSize)}</span>
                          </>
                        )}
                        {r?.error && <span style={{ color: '#f87171' }}>Error</span>}
                      </div>
                    </div>
                  )
                })}
              </div>

              {results.length > 0 && (
                <div className={`stats-banner ${savings > 0 ? 'stats-banner-success' : 'stats-banner-warn'}`} style={{ marginTop: 12 }}>
                  {savings > 0
                    ? `✅ Saved ${formatBytes(totalOriginal - totalCompressed)} (${savings}% reduction)`
                    : `⚠️ Output is larger than original — try lower quality`}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={compressAll} disabled={processing}>
                  {processing ? <><div className="spinner" /> Compressing...</> : '⚡ Compress All'}
                </button>
                {results.length > 0 && (
                  <button className="btn btn-secondary btn-lg" style={{ flex: 1 }} onClick={downloadAll}>
                    ⬇ Download ZIP
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

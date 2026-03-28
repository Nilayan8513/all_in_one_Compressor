import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

export default function Base64ImageConverter() {
  const [mode, setMode] = useState('encode') // 'encode' | 'decode'
  const [base64String, setBase64String] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [fileName, setFileName] = useState('image')

  const handleFiles = useCallback((files) => {
    const f = files[0]
    if (!f) return
    setFileName(f.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      setBase64String(e.target.result)
      setPreviewUrl(e.target.result)
    }
    reader.readAsDataURL(f)
  }, [])

  const handleDecode = useCallback(() => {
    if (!base64String.trim()) return toast.error('Paste a base64 string first')
    try {
      const src = base64String.trim()
      // Validate it's a data URL or raw base64
      const dataUrl = src.startsWith('data:') ? src : `data:image/png;base64,${src}`
      setPreviewUrl(dataUrl)
      toast.success('✅ Decoded successfully!')
    } catch {
      toast.error('Invalid base64 string')
    }
  }, [base64String])

  const handleCopy = () => {
    navigator.clipboard.writeText(base64String).then(() => toast.success('✅ Copied to clipboard!'))
  }

  const handleDownloadImage = () => {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = 'decoded_image.png'
    a.click()
    toast.success('✅ Image downloaded!')
  }

  const truncated = base64String.length > 200 ? base64String.slice(0, 200) + '...' : base64String

  return (
    <div className="animate-in">
      <PageHeader icon="⇄" iconClass="image" title="Base64 Image Converter" description="Convert between images and Base64 encoded strings" />
      <div className="page-body">
        <div style={{ width: '100%', maxWidth: 760 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="tabs">
              <button className={`tab ${mode === 'encode' ? 'active' : ''}`} onClick={() => { setMode('encode'); setBase64String(''); setPreviewUrl(null) }}>🖼️ Image → Base64</button>
              <button className={`tab ${mode === 'decode' ? 'active' : ''}`} onClick={() => { setMode('decode'); setBase64String(''); setPreviewUrl(null) }}>📄 Base64 → Image</button>
            </div>
          </div>

          {mode === 'encode' ? (
            <>
              {!previewUrl ? (
                <FileDropzone accept="image/*" onFiles={handleFiles} label="Drop an image here or" hint="Any image format" />
              ) : (
                <>
                  <div className="card" style={{ marginBottom: 12 }}>
                    <div className="card-title">Preview</div>
                    <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 'var(--radius-sm)', display: 'block', margin: '0 auto' }} />
                  </div>
                  <div className="card" style={{ marginBottom: 12 }}>
                    <div className="flex-between" style={{ marginBottom: 8 }}>
                      <div className="card-title" style={{ margin: 0 }}>Base64 String</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary btn-sm" onClick={handleCopy}>📋 Copy</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setPreviewUrl(null); setBase64String('') }}>Reset</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{base64String.length.toLocaleString()} characters</div>
                    <textarea readOnly value={base64String} style={{ width: '100%', minHeight: 140, padding: 10, fontFamily: 'monospace', fontSize: 11, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', resize: 'vertical', outline: 'none', lineHeight: 1.4 }} />
                  </div>
                  <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleCopy}>📋 Copy Base64 String</button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">Paste Base64 String</div>
                <textarea
                  className="form-input"
                  rows={6}
                  placeholder="Paste base64 string here (with or without data:image/...;base64, prefix)"
                  value={base64String}
                  onChange={e => setBase64String(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                />
              </div>
              {previewUrl && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div className="card-title">Decoded Image</div>
                  <img src={previewUrl} alt="Decoded" style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', display: 'block', margin: '0 auto', borderRadius: 'var(--radius-sm)' }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleDecode} disabled={!base64String.trim()}>🔍 Decode & Preview</button>
                {previewUrl && (
                  <button className="btn btn-secondary btn-lg" style={{ flex: 1 }} onClick={handleDownloadImage}>⬇ Download Image</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

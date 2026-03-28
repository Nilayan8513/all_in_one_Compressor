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

function readExif(file) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const piexif = await import('piexifjs')
        const dataUrl = e.target.result
        const exifObj = piexif.default.load(dataUrl)
        const tags = []
        const zeroth = exifObj['0th'] || {}
        const exif = exifObj['Exif'] || {}
        const gps = exifObj['GPS'] || {}

        const map0th = { 271: 'Make', 272: 'Model', 274: 'Orientation', 305: 'Software', 306: 'DateTime' }
        const mapExif = { 36867: 'DateTimeOriginal', 37380: 'ExposureBias', 37383: 'MeteringMode', 37385: 'Flash', 37386: 'FocalLength', 41986: 'ExposureMode', 41987: 'WhiteBalance' }
        const mapGPS = { 1: 'GPSLatitudeRef', 2: 'GPSLatitude', 3: 'GPSLongitudeRef', 4: 'GPSLongitude' }

        Object.entries(map0th).forEach(([k, v]) => { if (zeroth[k] !== undefined) tags.push({ key: v, value: String(zeroth[k]) }) })
        Object.entries(mapExif).forEach(([k, v]) => { if (exif[k] !== undefined) tags.push({ key: v, value: String(exif[k]) }) })
        Object.entries(mapGPS).forEach(([k, v]) => { if (gps[k] !== undefined) tags.push({ key: v, value: String(gps[k]) }) })

        resolve(tags.length ? tags : null)
      } catch {
        resolve(null)
      }
    }
    reader.readAsDataURL(file)
  })
}

export default function ImageMetadataStripper() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [exifTags, setExifTags] = useState(null)
  const [exifLoaded, setExifLoaded] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [stripped, setStripped] = useState(false)

  const handleFiles = useCallback(async (files) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStripped(false)
    setExifLoaded(false)
    const tags = await readExif(f)
    setExifTags(tags)
    setExifLoaded(true)
  }, [])

  const handleStrip = useCallback(async () => {
    if (!preview) return
    setProcessing(true)
    try {
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
      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.95))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'clean_' + file.name
      a.click()
      URL.revokeObjectURL(url)
      setStripped(true)
      toast.success('✅ Metadata stripped and image downloaded!')
    } catch (err) {
      toast.error('Failed to strip metadata')
    }
    setProcessing(false)
  }, [preview, file])

  return (
    <div className="animate-in">
      <PageHeader icon="🔏" iconClass="image" title="Image Metadata Stripper" description="Remove EXIF data (GPS, camera info) from your images" />
      <div className="page-body">
        <div style={{ width: '100%', maxWidth: 720 }}>
          {!file ? (
            <FileDropzone accept="image/jpeg,image/png" onFiles={handleFiles} label="Drop a JPG or PNG here or" hint="EXIF data will be read and stripped" />
          ) : (
            <div className="tool-layout">
              <div className="tool-panel sticky">
                <div className="card">
                  <div className="flex-between" style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setPreview(null); setExifTags(null); setStripped(false) }}>Change</button>
                  </div>
                  <div className="preview-panel"><img src={preview} alt="Preview" /></div>
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>{formatBytes(file.size)}</div>
                </div>
              </div>
              <div className="tool-panel">
                <div className="card">
                  <div className="card-title">📊 EXIF Metadata Found</div>
                  {!exifLoaded ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Reading metadata...</div>
                  ) : exifTags && exifTags.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {exifTags.map(tag => (
                        <div key={tag.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{tag.key}</span>
                          <span style={{ color: 'var(--text-primary)', maxWidth: '55%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tag.value}</span>
                        </div>
                      ))}
                      {exifTags.some(t => t.key.includes('GPS')) && (
                        <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: '#f87171' }}>
                          ⚠️ This image contains GPS location data!
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '12px', background: 'rgba(34,197,94,0.08)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#22c55e' }}>
                      ✅ No EXIF metadata detected in this image.
                    </div>
                  )}
                </div>
                {stripped && (
                  <div className="stats-banner stats-banner-success">✅ Metadata removed — clean image downloaded!</div>
                )}
                <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleStrip} disabled={processing}>
                  {processing ? <><div className="spinner" /> Processing...</> : '🔏 Strip Metadata & Download'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

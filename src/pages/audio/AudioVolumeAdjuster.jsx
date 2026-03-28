import { useState, useCallback, useRef } from 'react'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

export default function AudioVolumeAdjuster() {
  const [file, setFile] = useState(null)
  const [volume, setVolume] = useState(100) // percentage: 100 = 1.0
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState(null)
  const ffmpegRef = useRef(null)

  const handleFiles = useCallback((files) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setPreviewUrl(null)
  }, [])

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current
    const { FFmpeg } = await import('@ffmpeg/ffmpeg')
    const { fetchFile, toBlobURL } = await import('@ffmpeg/util')
    const ffmpeg = new FFmpeg()
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    ffmpegRef.current = { ffmpeg, fetchFile }
    return { ffmpeg, fetchFile }
  }

  const handleProcess = useCallback(async () => {
    if (!file) return
    setProcessing(true)
    setProgress(10)
    try {
      const { ffmpeg, fetchFile } = await loadFFmpeg()
      setProgress(30)
      const ext = file.name.split('.').pop()
      const inputName = `input.${ext}`
      const outputName = `output.${ext}`
      await ffmpeg.writeFile(inputName, await fetchFile(file))
      setProgress(50)
      const volMultiplier = volume / 100
      await ffmpeg.exec(['-i', inputName, '-filter:a', `volume=${volMultiplier}`, outputName])
      setProgress(85)
      const data = await ffmpeg.readFile(outputName)
      const mimeMap = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac', aac: 'audio/aac', m4a: 'audio/mp4' }
      const mime = mimeMap[ext] || 'audio/mpeg'
      const blob = new Blob([data.buffer], { type: mime })
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setProgress(100)
      toast.success(`✅ Volume set to ${volume}% — preview ready!`)
    } catch (err) {
      toast.error('Processing failed: ' + err.message)
    }
    setProcessing(false)
  }, [file, volume])

  const handleDownload = () => {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = 'volume_adjusted_' + file.name
    a.click()
    toast.success('✅ Downloaded!')
  }

  const dbDisplay = () => {
    const db = 20 * Math.log10(volume / 100)
    return db >= 0 ? `+${db.toFixed(1)} dB` : `${db.toFixed(1)} dB`
  }

  return (
    <div className="animate-in">
      <PageHeader icon="🔊" iconClass="audio" title="Audio Volume Adjuster" description="Boost or reduce audio volume using ffmpeg.wasm" />
      <div className="page-body">
        <div style={{ width: '100%', maxWidth: 560 }}>
          {!file ? (
            <FileDropzone accept="audio/*" onFiles={handleFiles} label="Drop an audio file here or" hint="MP3, WAV, OGG, FLAC, AAC" />
          ) : (
            <>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="flex-between">
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setPreviewUrl(null) }}>Change</button>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">Volume Level</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>{volume}%</span>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>{dbDisplay()}</span>
                </div>
                <input type="range" className="range-slider" min="10" max="300" step="5" value={volume} onChange={e => setVolume(Number(e.target.value))} />
                <div className="flex-between" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>10% (very quiet)</span><span>300% (loud)</span>
                </div>
                <div className="presets-row" style={{ flexWrap: 'wrap', marginTop: 10 }}>
                  {[50, 75, 100, 125, 150, 200].map(v => (
                    <button key={v} className={`preset-chip ${volume === v ? 'active' : ''}`} onClick={() => setVolume(v)}>{v}%</button>
                  ))}
                </div>
              </div>

              {previewUrl && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div className="card-title">🎵 Preview (Adjusted)</div>
                  <audio controls src={previewUrl} style={{ width: '100%' }} />
                </div>
              )}

              {processing && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div className="flex-between" style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>{progress < 30 ? 'Loading engine...' : 'Adjusting volume...'}</span>
                    <span style={{ fontSize: 14, color: 'var(--accent-light)' }}>{progress}%</span>
                  </div>
                  <div className="progress-bar-container"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleProcess} disabled={processing}>
                  {processing ? <><div className="spinner" /> Processing...</> : '🔊 Apply Volume'}
                </button>
                {previewUrl && (
                  <button className="btn btn-secondary btn-lg" style={{ flex: 1 }} onClick={handleDownload}>⬇ Download</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

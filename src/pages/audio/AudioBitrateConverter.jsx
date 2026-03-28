import { useState, useCallback, useRef } from 'react'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

const BITRATES = ['64k', '96k', '128k', '192k', '256k', '320k']
const OUTPUT_FORMATS = ['mp3', 'aac', 'ogg', 'wav', 'flac']

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function AudioBitrateConverter() {
  const [file, setFile] = useState(null)
  const [outputFormat, setOutputFormat] = useState('mp3')
  const [bitrate, setBitrate] = useState('128k')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [outputBlob, setOutputBlob] = useState(null)
  const [outputSize, setOutputSize] = useState(null)
  const ffmpegRef = useRef(null)

  const handleFiles = useCallback((files) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setOutputBlob(null)
    setOutputSize(null)
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

  const handleConvert = useCallback(async () => {
    if (!file) return
    setProcessing(true)
    setProgress(10)
    try {
      const { ffmpeg, fetchFile } = await loadFFmpeg()
      setProgress(30)
      const ext = file.name.split('.').pop()
      const inputName = `input.${ext}`
      const outputName = `output.${outputFormat}`
      await ffmpeg.writeFile(inputName, await fetchFile(file))
      setProgress(50)
      const args = ['-i', inputName]
      if (outputFormat !== 'wav' && outputFormat !== 'flac') {
        args.push('-b:a', bitrate)
      }
      args.push(outputName)
      await ffmpeg.exec(args)
      setProgress(85)
      const data = await ffmpeg.readFile(outputName)
      const mimeMap = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac', aac: 'audio/aac' }
      const blob = new Blob([data.buffer], { type: mimeMap[outputFormat] || 'audio/mpeg' })
      setOutputBlob(blob)
      setOutputSize(blob.size)
      setProgress(100)
      const savings = Math.round((1 - blob.size / file.size) * 100)
      if (blob.size < file.size) {
        toast.success(`✅ Saved ${formatBytes(file.size - blob.size)} (${savings}% smaller)`)
      } else {
        toast('Converted! Output is slightly larger.', { icon: '⚠️' })
      }
    } catch (err) {
      toast.error('Conversion failed: ' + err.message)
    }
    setProcessing(false)
  }, [file, outputFormat, bitrate])

  const handleDownload = () => {
    if (!outputBlob) return
    const url = URL.createObjectURL(outputBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name.replace(/\.[^.]+$/, '') + '.' + outputFormat
    a.click()
    URL.revokeObjectURL(url)
    toast.success('✅ Downloaded!')
  }

  const lossless = outputFormat === 'wav' || outputFormat === 'flac'

  return (
    <div className="animate-in">
      <PageHeader icon="🎚️" iconClass="audio" title="Audio Bitrate Converter" description="Convert audio format and bitrate using ffmpeg.wasm" />
      <div className="page-body">
        <div style={{ width: '100%', maxWidth: 580 }}>
          {!file ? (
            <FileDropzone accept="audio/*" onFiles={handleFiles} label="Drop an audio file here or" hint="Supports MP3, WAV, OGG, AAC, FLAC" />
          ) : (
            <>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Original: {formatBytes(file.size)}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setOutputBlob(null); setOutputSize(null) }}>Change</button>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">Output Format</div>
                <div className="tabs" style={{ flexWrap: 'wrap' }}>
                  {OUTPUT_FORMATS.map(f => (
                    <button key={f} className={`tab ${outputFormat === f ? 'active' : ''}`} onClick={() => setOutputFormat(f)}>{f.toUpperCase()}</button>
                  ))}
                </div>
              </div>

              {!lossless && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div className="card-title">Bitrate</div>
                  <div className="presets-row" style={{ flexWrap: 'wrap' }}>
                    {BITRATES.map(b => (
                      <button key={b} className={`preset-chip ${bitrate === b ? 'active' : ''}`} onClick={() => setBitrate(b)}>{b}</button>
                    ))}
                  </div>
                </div>
              )}

              {outputSize && (
                <div className={`stats-banner ${outputSize < file.size ? 'stats-banner-success' : 'stats-banner-warn'}`} style={{ marginBottom: 12 }}>
                  {outputSize < file.size
                    ? `✅ Saved ${formatBytes(file.size - outputSize)} (${Math.round((1 - outputSize / file.size) * 100)}% reduction) — Output: ${formatBytes(outputSize)}`
                    : `⚠️ Output (${formatBytes(outputSize)}) is larger than original — try a lower bitrate`}
                </div>
              )}

              {processing && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div className="flex-between" style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>{progress < 30 ? 'Loading audio engine...' : 'Converting...'}</span>
                    <span style={{ fontSize: 14, color: 'var(--accent-light)' }}>{progress}%</span>
                  </div>
                  <div className="progress-bar-container"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleConvert} disabled={processing}>
                  {processing ? <><div className="spinner" /> Converting...</> : `Convert to ${outputFormat.toUpperCase()}`}
                </button>
                {outputBlob && (
                  <button className="btn btn-secondary btn-lg" style={{ flex: 1 }} onClick={handleDownload}>
                    ⬇ Download
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

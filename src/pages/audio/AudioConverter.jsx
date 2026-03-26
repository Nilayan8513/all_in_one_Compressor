import { useState, useCallback, useRef } from 'react'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

const INPUT_FORMATS = ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'opus']
const OUTPUT_FORMATS = ['mp3', 'wav', 'ogg', 'flac']
const BITRATES = [64, 128, 192, 256, 320]
const SAMPLE_RATES = [22050, 44100, 48000]

export default function AudioConverter() {
  const [file, setFile] = useState(null)
  const [outputFormat, setOutputFormat] = useState('mp3')
  const [bitrate, setBitrate] = useState(192)
  const [sampleRate, setSampleRate] = useState(44100)
  const [channels, setChannels] = useState('stereo')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false)
  const [error, setError] = useState(null)
  const ffmpegRef = useRef(null)

  const handleFiles = useCallback((files) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setError(null)
  }, [])

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current

    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const { fetchFile, toBlobURL } = await import('@ffmpeg/util')
      const ffmpeg = new FFmpeg()

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })

      ffmpegRef.current = { ffmpeg, fetchFile }
      setFfmpegLoaded(true)
      return { ffmpeg, fetchFile }
    } catch (err) {
      console.error('FFmpeg load failed:', err)
      setError('Failed to load audio processor. Your browser may not support SharedArrayBuffer. Try using Chrome or Edge with proper headers.')
      throw err
    }
  }

  const handleConvert = useCallback(async () => {
    if (!file) return
    setProcessing(true)
    setProgress(10)
    setError(null)

    try {
      const { ffmpeg, fetchFile } = await loadFFmpeg()
      setProgress(30)

      const inputName = `input.${file.name.split('.').pop()}`
      const outputName = `output.${outputFormat}`

      await ffmpeg.writeFile(inputName, await fetchFile(file))
      setProgress(50)

      const args = ['-i', inputName]

      if (outputFormat !== 'wav' && outputFormat !== 'flac') {
        args.push('-b:a', `${bitrate}k`)
      }
      args.push('-ar', sampleRate.toString())
      args.push('-ac', channels === 'mono' ? '1' : '2')
      args.push(outputName)

      await ffmpeg.exec(args)
      setProgress(80)

      const data = await ffmpeg.readFile(outputName)
      const mimeMap = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac' }
      const blob = new Blob([data.buffer], { type: mimeMap[outputFormat] || 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `converted.${outputFormat}`
      a.click()
      URL.revokeObjectURL(url)
      setProgress(100)
    } catch (err) {
      console.error('Conversion failed:', err)
      if (!error) setError('Conversion failed. The file format may not be supported.')
    }
    setProcessing(false)
  }, [file, outputFormat, bitrate, sampleRate, channels])

  const isLossy = outputFormat === 'mp3' || outputFormat === 'ogg'

  return (
    <div className="animate-in">
      <PageHeader
        icon="🔄"
        iconClass="audio"
        title="Audio Format Converter"
        description="Convert between audio formats with full control over quality"
      />
      <div className="page-body">
        <div style={{ maxWidth: 600 }}>
          {!file ? (
            <FileDropzone
              accept="audio/*"
              onFiles={handleFiles}
              label="Drop an audio file here or"
              hint="Supports MP3, WAV, AAC, OGG, FLAC, M4A, OPUS"
            />
          ) : (
            <div>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="flex-between">
                  <div className="flex-row">
                    <div style={{ fontSize: 28 }}>🎵</div>
                    <div>
                      <div className="card-title" style={{ margin: 0 }}>{file.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setFile(null)}>Change</button>
                </div>
              </div>

              {error && (
                <div className="card" style={{ marginBottom: 12, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
                  <div style={{ color: '#f87171', fontSize: 14 }}>⚠️ {error}</div>
                </div>
              )}

              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">Output Settings</div>

                <div className="card-section">
                  <div className="form-group">
                    <label className="form-label">Output Format</label>
                    <div className="tabs">
                      {OUTPUT_FORMATS.map(f => (
                        <button key={f} className={`tab ${outputFormat === f ? 'active' : ''}`} onClick={() => setOutputFormat(f)}>
                          {f.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {isLossy && (
                  <div className="card-section">
                    <div className="form-group">
                      <label className="form-label">Bitrate: {bitrate} kbps</label>
                      <div className="presets-row">
                        {BITRATES.map(b => (
                          <button key={b} className={`preset-chip ${bitrate === b ? 'active' : ''}`} onClick={() => setBitrate(b)}>
                            {b} kbps
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="card-section">
                  <div className="form-group">
                    <label className="form-label">Sample Rate</label>
                    <div className="presets-row">
                      {SAMPLE_RATES.map(s => (
                        <button key={s} className={`preset-chip ${sampleRate === s ? 'active' : ''}`} onClick={() => setSampleRate(s)}>
                          {(s / 1000).toFixed(1)} kHz
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card-section">
                  <div className="form-group">
                    <label className="form-label">Channels</label>
                    <div className="tabs" style={{ maxWidth: 300 }}>
                      <button className={`tab ${channels === 'mono' ? 'active' : ''}`} onClick={() => setChannels('mono')}>Mono</button>
                      <button className={`tab ${channels === 'stereo' ? 'active' : ''}`} onClick={() => setChannels('stereo')}>Stereo</button>
                    </div>
                  </div>
                </div>
              </div>

              {processing && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div className="flex-between" style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>{progress < 30 ? 'Loading audio engine...' : 'Converting...'}</span>
                    <span style={{ fontSize: 14, color: 'var(--accent-light)' }}>{progress}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={handleConvert}
                disabled={processing}
              >
                {processing ? <><div className="spinner" /> Converting...</> : `Convert to ${outputFormat.toUpperCase()}`}
              </button>

              {!ffmpegLoaded && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                  ⓘ Audio engine (~30 MB) will be loaded on first conversion
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useCallback, useRef, useEffect } from 'react'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

export default function AudioTrimmer() {
  const [file, setFile] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [fadeIn, setFadeIn] = useState(0)
  const [fadeOut, setFadeOut] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [waveformData, setWaveformData] = useState([])
  const [dragging, setDragging] = useState(null) // 'start' | 'end' | 'playhead' | null
  const audioRef = useRef(null)
  const waveformRef = useRef(null)
  const animRef = useRef(null)
  const ffmpegRef = useRef(null)

  const handleFiles = useCallback((files) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setError(null)
    const url = URL.createObjectURL(f)
    setAudioUrl(url)
    generateWaveform(f)
  }, [])

  // Generate real waveform data from audio file
  const generateWaveform = async (audioFile) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const arrayBuffer = await audioFile.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const channelData = audioBuffer.getChannelData(0)
      const bars = 200
      const samplesPerBar = Math.floor(channelData.length / bars)
      const peaks = []

      for (let i = 0; i < bars; i++) {
        let sum = 0
        const start = i * samplesPerBar
        for (let j = start; j < start + samplesPerBar && j < channelData.length; j++) {
          sum += Math.abs(channelData[j])
        }
        peaks.push(sum / samplesPerBar)
      }

      // Normalize peaks to 0-1
      const maxPeak = Math.max(...peaks) || 1
      const normalized = peaks.map(p => p / maxPeak)
      setWaveformData(normalized)
      audioContext.close()
    } catch (err) {
      console.error('Waveform generation failed:', err)
      // Fallback: empty waveform
      setWaveformData(Array.from({ length: 200 }, () => 0.3))
    }
  }

  useEffect(() => {
    if (!audioUrl) return
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => {
      setDuration(audio.duration)
      setEndTime(audio.duration)
    }
    audio.addEventListener('loadedmetadata', onLoaded)
    return () => audio.removeEventListener('loadedmetadata', onLoaded)
  }, [audioUrl])

  const updateProgress = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    setCurrentTime(audio.currentTime)

    if (audio.currentTime >= endTime) {
      audio.pause()
      setIsPlaying(false)
      return
    }

    if (isPlaying) {
      animRef.current = requestAnimationFrame(updateProgress)
    }
  }, [endTime, isPlaying])

  useEffect(() => {
    if (isPlaying) {
      animRef.current = requestAnimationFrame(updateProgress)
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [isPlaying, updateProgress])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      if (audio.currentTime < startTime || audio.currentTime >= endTime) {
        audio.currentTime = startTime
      }
      audio.play()
      setIsPlaying(true)
    }
  }

  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  // Dragging logic for handles and playhead
  const getTimeFromEvent = (e) => {
    const rect = waveformRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    return x * duration
  }

  const handleMouseDown = (e, type) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(type)
  }

  const handleWaveformClick = (e) => {
    if (dragging) return
    const time = getTimeFromEvent(e)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  useEffect(() => {
    if (!dragging) return

    const handleMouseMove = (e) => {
      const time = getTimeFromEvent(e)
      if (dragging === 'start') {
        const clamped = Math.max(0, Math.min(time, endTime - 0.1))
        setStartTime(clamped)
      } else if (dragging === 'end') {
        const clamped = Math.min(duration, Math.max(time, startTime + 0.1))
        setEndTime(clamped)
      } else if (dragging === 'playhead') {
        const clamped = Math.max(0, Math.min(time, duration))
        if (audioRef.current) {
          audioRef.current.currentTime = clamped
        }
        setCurrentTime(clamped)
      }
    }

    const handleMouseUp = () => {
      setDragging(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, duration, startTime, endTime])

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
      return { ffmpeg, fetchFile }
    } catch (err) {
      setError('Failed to load audio engine. Try Chrome or Edge.')
      throw err
    }
  }

  const handleExport = useCallback(async () => {
    if (!file) return
    setProcessing(true)
    setError(null)

    try {
      const { ffmpeg, fetchFile } = await loadFFmpeg()
      const ext = file.name.split('.').pop()
      const inputName = `input.${ext}`
      const outputName = `trimmed.${ext}`

      await ffmpeg.writeFile(inputName, await fetchFile(file))

      const trimDuration = endTime - startTime
      const args = ['-i', inputName, '-ss', startTime.toFixed(3), '-t', trimDuration.toFixed(3)]

      // Apply fades with audio filters
      const filters = []
      if (fadeIn > 0) filters.push(`afade=t=in:st=0:d=${fadeIn}`)
      if (fadeOut > 0) filters.push(`afade=t=out:st=${trimDuration - fadeOut}:d=${fadeOut}`)
      if (filters.length > 0) args.push('-af', filters.join(','))

      args.push('-c:a', 'libmp3lame', outputName)

      await ffmpeg.exec(args)
      const data = await ffmpeg.readFile(outputName)
      const blob = new Blob([data.buffer], { type: `audio/${ext}` })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trimmed_${file.name}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Trim failed:', err)
      if (!error) setError('Trim failed. Try a different format.')
    }
    setProcessing(false)
  }, [file, startTime, endTime, fadeIn, fadeOut])

  const trimDuration = endTime - startTime
  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100
  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="animate-in">
      <PageHeader
        icon="✂️"
        iconClass="audio"
        title="Audio Trim & Cut"
        description="Trim audio with visual waveform, set fade effects, and export"
      />
      <div className="page-body">
        <div style={{ maxWidth: 800, width: '100%', margin: '0 auto' }}>
          {!file ? (
            <FileDropzone
              accept="audio/*"
              onFiles={handleFiles}
              label="Drop an audio file here or"
              hint="Supports MP3, WAV, OGG, FLAC and more"
              maxSize={50 * 1024 * 1024}
            />
          ) : (
            <div>
              <audio ref={audioRef} src={audioUrl} preload="metadata" />

              <div className="card" style={{ marginBottom: 12 }}>
                <div className="flex-between" style={{ marginBottom: 16 }}>
                  <div className="flex-row">
                    <div style={{ fontSize: 28 }}>🎵</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{file.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Duration: {formatTime(duration)} • {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setAudioUrl(null); setIsPlaying(false); setWaveformData([]) }}>Change</button>
                </div>

                {/* Waveform with draggable handles */}
                <div
                  ref={waveformRef}
                  className="waveform-container"
                  onClick={handleWaveformClick}
                  style={{
                    cursor: dragging ? 'grabbing' : 'pointer',
                    position: 'relative',
                    height: 120,
                    marginBottom: 16,
                    userSelect: 'none',
                    overflow: 'hidden',
                  }}
                >
                  {/* Dimmed regions outside selection */}
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${startPercent}%`,
                    background: 'rgba(0,0,0,0.45)',
                    zIndex: 3, borderRadius: '8px 0 0 8px',
                    pointerEvents: 'none',
                  }} />
                  <div style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0,
                    width: `${100 - endPercent}%`,
                    background: 'rgba(0,0,0,0.45)',
                    zIndex: 3, borderRadius: '0 8px 8px 0',
                    pointerEvents: 'none',
                  }} />

                  {/* Selected region highlight */}
                  <div style={{
                    position: 'absolute',
                    left: `${startPercent}%`,
                    width: `${endPercent - startPercent}%`,
                    top: 0, bottom: 0,
                    background: 'rgba(52, 211, 153, 0.08)',
                    borderTop: '2px solid var(--audio-accent)',
                    borderBottom: '2px solid var(--audio-accent)',
                    zIndex: 2,
                    pointerEvents: 'none',
                  }} />

                  {/* Real waveform bars */}
                  <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 1, padding: '0 2px', position: 'relative', zIndex: 1 }}>
                    {waveformData.map((peak, i) => {
                      const pos = (i / waveformData.length) * 100
                      const inRegion = pos >= startPercent && pos <= endPercent
                      const barHeight = Math.max(4, peak * 90)
                      return (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: `${barHeight}%`,
                            background: inRegion
                              ? `rgba(52, 211, 153, ${0.5 + peak * 0.5})`
                              : `rgba(255,255,255,${0.08 + peak * 0.12})`,
                            borderRadius: 2,
                            transition: 'background 0.15s',
                            minWidth: 1,
                          }}
                        />
                      )
                    })}
                  </div>

                  {/* Start handle (green, draggable) */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'start')}
                    style={{
                      position: 'absolute',
                      left: `${startPercent}%`,
                      top: 0, bottom: 0,
                      width: 14,
                      marginLeft: -7,
                      cursor: 'ew-resize',
                      zIndex: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <div style={{
                      width: 4, height: '100%',
                      background: 'var(--audio-accent)',
                      borderRadius: 2,
                      boxShadow: '0 0 8px rgba(52, 211, 153, 0.5)',
                    }} />
                    {/* Handle grip */}
                    <div style={{
                      position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                      width: 18, height: 36, borderRadius: 6,
                      background: 'var(--audio-accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      cursor: 'ew-resize',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ width: 6, height: 1.5, background: 'rgba(0,0,0,0.4)', borderRadius: 1 }} />
                        <div style={{ width: 6, height: 1.5, background: 'rgba(0,0,0,0.4)', borderRadius: 1 }} />
                        <div style={{ width: 6, height: 1.5, background: 'rgba(0,0,0,0.4)', borderRadius: 1 }} />
                      </div>
                    </div>
                    {/* Time label — inside box, top-left of handle */}
                    <div style={{
                      position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
                      fontSize: 10, fontWeight: 700, color: 'var(--audio-accent)',
                      fontFamily: 'monospace', whiteSpace: 'nowrap',
                      background: 'rgba(0,0,0,0.55)', padding: '1px 5px', borderRadius: 4,
                      zIndex: 12,
                    }}>
                      {formatTime(startTime)}
                    </div>
                  </div>

                  {/* End handle (green, draggable) */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'end')}
                    style={{
                      position: 'absolute',
                      left: `${endPercent}%`,
                      top: 0, bottom: 0,
                      width: 14,
                      marginLeft: -7,
                      cursor: 'ew-resize',
                      zIndex: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <div style={{
                      width: 4, height: '100%',
                      background: 'var(--audio-accent)',
                      borderRadius: 2,
                      boxShadow: '0 0 8px rgba(52, 211, 153, 0.5)',
                    }} />
                    {/* Handle grip */}
                    <div style={{
                      position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                      width: 18, height: 36, borderRadius: 6,
                      background: 'var(--audio-accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      cursor: 'ew-resize',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ width: 6, height: 1.5, background: 'rgba(0,0,0,0.4)', borderRadius: 1 }} />
                        <div style={{ width: 6, height: 1.5, background: 'rgba(0,0,0,0.4)', borderRadius: 1 }} />
                        <div style={{ width: 6, height: 1.5, background: 'rgba(0,0,0,0.4)', borderRadius: 1 }} />
                      </div>
                    </div>
                    {/* Time label — inside box, top-right of handle */}
                    <div style={{
                      position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
                      fontSize: 10, fontWeight: 700, color: 'var(--audio-accent)',
                      fontFamily: 'monospace', whiteSpace: 'nowrap',
                      background: 'rgba(0,0,0,0.55)', padding: '1px 5px', borderRadius: 4,
                      zIndex: 12,
                    }}>
                      {formatTime(endTime)}
                    </div>
                  </div>

                  {/* Playhead (white, draggable) */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'playhead')}
                    style={{
                      position: 'absolute',
                      left: `${currentPercent}%`,
                      top: 0, bottom: 0,
                      width: 12,
                      marginLeft: -6,
                      cursor: 'ew-resize',
                      zIndex: 11,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <div style={{
                      width: 2, height: '100%',
                      background: 'white',
                      boxShadow: '0 0 6px rgba(255,255,255,0.5)',
                    }} />
                    {/* Playhead triangle top */}
                    <div style={{
                      position: 'absolute', top: -2,
                      width: 0, height: 0,
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: '8px solid white',
                    }} />
                  </div>
                </div>

                {/* Playback controls */}
                <div className="flex-row" style={{ justifyContent: 'center', marginBottom: 16 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { if (audioRef.current) audioRef.current.currentTime = startTime; setCurrentTime(startTime) }}>
                    ⏮ Start
                  </button>
                  <button className="btn btn-primary" onClick={togglePlay} style={{ width: 48, height: 48, borderRadius: '50%', fontSize: 18 }}>
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { if (audioRef.current) audioRef.current.currentTime = endTime; setCurrentTime(endTime) }}>
                    End ⏭
                  </button>
                </div>

                <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Trim info */}
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">Trim Region</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <span className="badge badge-info">
                    ✂️ Selected: {formatTime(trimDuration)}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {formatTime(startTime)} → {formatTime(endTime)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
                  Drag the green handles on the waveform to set start & end points
                </div>
              </div>

              {/* Fade Effects */}
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">Fade Effects</div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Fade In: {fadeIn.toFixed(1)}s</label>
                    <input
                      type="range"
                      className="range-slider"
                      min="0"
                      max="5"
                      step="0.1"
                      value={fadeIn}
                      onChange={(e) => setFadeIn(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fade Out: {fadeOut.toFixed(1)}s</label>
                    <input
                      type="range"
                      className="range-slider"
                      min="0"
                      max="5"
                      step="0.1"
                      value={fadeOut}
                      onChange={(e) => setFadeOut(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="card" style={{ marginBottom: 12, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
                  <div style={{ color: '#f87171', fontSize: 14 }}>⚠️ {error}</div>
                </div>
              )}

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={handleExport}
                disabled={processing}
              >
                {processing ? <><div className="spinner" /> Trimming...</> : '⬇ Export Trimmed Audio'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

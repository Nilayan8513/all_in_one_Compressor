import { useState, useCallback, useRef } from 'react'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

export default function AudioMerger() {
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [crossfade, setCrossfade] = useState(0)
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const ffmpegRef = useRef(null)

  const handleFiles = useCallback((newFiles) => {
    const audios = Array.from(newFiles).filter(f => f.type.startsWith('audio/'))
    setFiles(prev => [...prev, ...audios].slice(0, 5))
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

  const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i))

  const handleDragStart = (i) => setDragIdx(i)
  const handleDragOver = (e, i) => { e.preventDefault(); setDragOverIdx(i) }
  const handleDrop = (e, i) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return }
    setFiles(prev => {
      const next = [...prev]
      const [removed] = next.splice(dragIdx, 1)
      next.splice(i, 0, removed)
      return next
    })
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const handleMerge = useCallback(async () => {
    if (files.length < 2) return toast.error('Upload at least 2 audio files')
    setProcessing(true)
    setProgress(10)
    try {
      const { ffmpeg, fetchFile } = await loadFFmpeg()
      setProgress(20)

      const filenames = []
      for (let i = 0; i < files.length; i++) {
        const ext = files[i].name.split('.').pop()
        const name = `input${i}.${ext}`
        await ffmpeg.writeFile(name, await fetchFile(files[i]))
        filenames.push(name)
        setProgress(20 + Math.round((30 / files.length) * i))
      }

      setProgress(55)

      let args, outputName
      if (crossfade > 0 && files.length === 2) {
        // Crossfade using acrossfade filter (only works for exactly 2 streams easily)
        outputName = 'merged.mp3'
        args = [
          '-i', filenames[0], '-i', filenames[1],
          '-filter_complex', `acrossfade=d=${crossfade}:c1=tri:c2=tri`,
          outputName
        ]
      } else {
        // Concat demuxer
        outputName = 'merged.mp3'
        const concatContent = filenames.map(f => `file '${f}'`).join('\n')
        await ffmpeg.writeFile('list.txt', new TextEncoder().encode(concatContent))
        args = ['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', outputName]
      }

      await ffmpeg.exec(args)
      setProgress(85)
      const data = await ffmpeg.readFile(outputName)
      const blob = new Blob([data.buffer], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'merged_audio.mp3'
      a.click()
      URL.revokeObjectURL(url)
      setProgress(100)
      toast.success(`✅ Merged ${files.length} audio files!`)
    } catch (err) {
      toast.error('Merge failed: ' + err.message)
    }
    setProcessing(false)
  }, [files, crossfade])

  return (
    <div className="animate-in">
      <PageHeader icon="🎶" iconClass="audio" title="Audio Merger" description="Combine multiple audio files into one with ffmpeg.wasm" />
      <div className="page-body">
        <div style={{ width: '100%', maxWidth: 580 }}>
          <FileDropzone accept="audio/*" onFiles={handleFiles} label="Drop audio files here or" hint="Up to 5 files — MP3, WAV, OGG, FLAC" multiple />

          {files.length > 0 && (
            <>
              <div className="card" style={{ marginTop: 16, marginBottom: 12 }}>
                <div className="flex-between" style={{ marginBottom: 10 }}>
                  <div className="card-title" style={{ margin: 0 }}>{files.length} file{files.length !== 1 ? 's' : ''} — drag to reorder</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setFiles([])}>Clear All</button>
                </div>
                {files.map((f, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={(e) => handleDrop(e, i)}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)', marginBottom: 6,
                      border: `1px solid ${dragOverIdx === i ? 'var(--accent)' : 'var(--border)'}`,
                      background: dragIdx === i ? 'var(--accent-subtle)' : 'var(--bg-primary)',
                      cursor: 'grab', transition: 'all 0.1s', opacity: dragIdx === i ? 0.5 : 1,
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>⠿</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 13, minWidth: 24 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => removeFile(i)}>✕</button>
                  </div>
                ))}
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">Crossfade Between Clips</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Works best with 2 files</div>
                <div className="form-group">
                  <label className="form-label">Duration: {crossfade}s</label>
                  <input type="range" className="range-slider" min="0" max="5" step="0.5" value={crossfade} onChange={e => setCrossfade(Number(e.target.value))} />
                </div>
                {crossfade > 0 && files.length > 2 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#f59e0b' }}>⚠️ Crossfade only applies to 2-file merges. For 3+ files, concat will be used.</div>
                )}
              </div>

              {processing && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div className="flex-between" style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>{progress < 30 ? 'Loading engine...' : 'Merging...'}</span>
                    <span style={{ fontSize: 14, color: 'var(--accent-light)' }}>{progress}%</span>
                  </div>
                  <div className="progress-bar-container"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div>
                </div>
              )}

              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleMerge} disabled={processing || files.length < 2}>
                {processing ? <><div className="spinner" /> Merging...</> : `🎶 Merge ${files.length} Files`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useRef, useCallback } from 'react'

export default function FileDropzone({ accept, multiple = false, onFiles, label, hint, maxSize }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      onFiles(multiple ? files : [files[0]])
    }
  }, [multiple, onFiles])

  const handleChange = useCallback((e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      onFiles(multiple ? files : [files[0]])
    }
    e.target.value = ''
  }, [multiple, onFiles])

  return (
    <div
      className={`dropzone ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="dropzone-icon">📁</div>
      <div className="dropzone-text">
        {label || 'Drop files here or'}{' '}
        <span className="dropzone-browse">browse</span>
      </div>
      <div className="dropzone-hint">
        {hint || 'Supports common file formats'}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}

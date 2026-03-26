import { useState, useRef, useCallback } from 'react'
import { useToast } from './Toast'

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileDropzone({ accept, multiple = false, onFiles, label, hint, maxSize }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef(null)
  const toast = useToast()

  const validateAndPass = useCallback((files) => {
    if (maxSize) {
      const oversized = files.filter(f => f.size > maxSize)
      if (oversized.length > 0) {
        toast(`File too large (${formatBytes(oversized[0].size)}). Maximum allowed: ${formatBytes(maxSize)}`, 'error')
        return
      }
    }
    onFiles(files)
  }, [maxSize, onFiles, toast])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      validateAndPass(multiple ? files : [files[0]])
    }
  }, [multiple, validateAndPass])

  const handleChange = useCallback((e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      validateAndPass(multiple ? files : [files[0]])
    }
    e.target.value = ''
  }, [multiple, validateAndPass])

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
      {maxSize && (
        <div className="dropzone-limit">
          Max file size: {formatBytes(maxSize)}
        </div>
      )}
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

import { useState, useCallback, useRef, useEffect } from 'react'
import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function getSizeColor(ratio) {
  if (ratio <= 0.3) return 'green'
  if (ratio <= 0.7) return 'yellow'
  return 'red'
}

export default function PdfCompressor() {
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [originalSize, setOriginalSize] = useState(0)
  const [quality, setQuality] = useState(70)
  const [dpiScale, setDpiScale] = useState(1.5) // render scale factor
  const [estimatedSize, setEstimatedSize] = useState(null)
  const [compressedSize, setCompressedSize] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [estimating, setEstimating] = useState(false)

  const pdfDocRef = useRef(null)
  const pdfBytesRef = useRef(null)
  const estimateTimerRef = useRef(null)

  const handleFiles = useCallback(async (files) => {
    const f = files[0]
    if (!f) return
    setFile(f)
    setOriginalSize(f.size)
    setCompressedSize(null)
    setEstimatedSize(null)

    try {
      const buffer = await f.arrayBuffer()
      pdfBytesRef.current = new Uint8Array(buffer)
      const pdf = await PDFDocument.load(buffer)
      setPageCount(pdf.getPageCount())

      // Generate first page preview
      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
      pdfDocRef.current = pdfDoc
      const page = await pdfDoc.getPage(1)
      const viewport = page.getViewport({ scale: 1.0 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      await page.render({ canvasContext: ctx, viewport }).promise
      setPreviewUrl(canvas.toDataURL('image/jpeg', 0.8))
    } catch (err) {
      console.error('Failed to load PDF:', err)
    }
  }, [])

  // Estimate compressed size by compressing first page
  const estimateCompressedSize = useCallback(async (q, scale) => {
    if (!pdfDocRef.current || !pdfBytesRef.current) return

    setEstimating(true)
    try {
      const pdfDoc = pdfDocRef.current
      const totalPages = pdfDoc.numPages

      // Compress first page to estimate average per-page size
      const page = await pdfDoc.getPage(1)
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      await page.render({ canvasContext: ctx, viewport }).promise

      const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', q / 100)
      )

      // Estimate: per-page JPEG size × page count + ~2KB PDF overhead per page
      const perPageSize = blob.size
      const overheadPerPage = 2048
      const baseOverhead = 1024
      const estimated = (perPageSize + overheadPerPage) * totalPages + baseOverhead

      setEstimatedSize(estimated)
    } catch (err) {
      console.error('Estimation failed:', err)
    }
    setEstimating(false)
  }, [])

  // Debounced estimation on quality/scale change
  useEffect(() => {
    if (!file || !pdfDocRef.current) return

    if (estimateTimerRef.current) {
      clearTimeout(estimateTimerRef.current)
    }

    estimateTimerRef.current = setTimeout(() => {
      estimateCompressedSize(quality, dpiScale)
    }, 300)

    return () => {
      if (estimateTimerRef.current) {
        clearTimeout(estimateTimerRef.current)
      }
    }
  }, [quality, dpiScale, file, estimateCompressedSize])

  const handleCompress = useCallback(async () => {
    if (!pdfDocRef.current || !pdfBytesRef.current) return
    setProcessing(true)
    setProgress(0)

    try {
      const srcPdfDoc = pdfDocRef.current
      const totalPages = srcPdfDoc.numPages
      const newPdf = await PDFDocument.create()

      for (let i = 1; i <= totalPages; i++) {
        setProgress(Math.round((i / totalPages) * 90))

        const page = await srcPdfDoc.getPage(i)
        const viewport = page.getViewport({ scale: dpiScale })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        await page.render({ canvasContext: ctx, viewport }).promise

        // Convert canvas to JPEG at the exact quality the user set
        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality / 100)
        const jpegBytes = Uint8Array.from(
          atob(jpegDataUrl.split(',')[1]),
          c => c.charCodeAt(0)
        )

        // Embed the JPEG into the new PDF
        const jpegImage = await newPdf.embedJpg(jpegBytes)

        // Use original page dimensions (in PDF points) for the new page
        const origViewport = page.getViewport({ scale: 1.0 })
        const newPage = newPdf.addPage([origViewport.width, origViewport.height])

        newPage.drawImage(jpegImage, {
          x: 0,
          y: 0,
          width: origViewport.width,
          height: origViewport.height,
        })
      }

      setProgress(95)
      const pdfBytes = await newPdf.save()
      setCompressedSize(pdfBytes.length)
      setProgress(100)

      // Download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `compressed_q${quality}_${file.name}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Compression failed:', err)
    }
    setProcessing(false)
  }, [file, quality, dpiScale])

  const compressionRatio = estimatedSize
    ? ((1 - estimatedSize / originalSize) * 100).toFixed(1)
    : null

  const actualRatio = compressedSize
    ? ((1 - compressedSize / originalSize) * 100).toFixed(1)
    : null

  const qualityLabel = quality >= 80
    ? 'High Quality'
    : quality >= 50
    ? 'Medium'
    : quality >= 25
    ? 'Low — Smaller File'
    : 'Very Low — Tiny File'

  const qualityBadge = quality >= 80
    ? 'badge-success'
    : quality >= 50
    ? 'badge-info'
    : quality >= 25
    ? 'badge-warning'
    : 'badge-danger'

  const DPI_PRESETS = [
    { label: 'Low (72 DPI)', value: 1.0 },
    { label: 'Medium (150 DPI)', value: 1.5 },
    { label: 'High (300 DPI)', value: 2.0 },
  ]

  return (
    <div className="animate-in">
      <PageHeader
        icon="📦"
        iconClass="pdf"
        title="PDF Compressor"
        description="Compress PDFs with precise quality control — see real file sizes"
      />
      <div className="page-body">
        {!file ? (
          <FileDropzone
            accept="application/pdf"
            onFiles={handleFiles}
            label="Drop a PDF here or"
            hint="Compress PDFs by adjusting image quality — see exact sizes"
          />
        ) : (
          <div className="tool-layout">
            {/* Left Panel — Preview & File Info */}
            <div className="tool-panel sticky">
              {/* Preview */}
              <div className="card">
                <div className="flex-between" style={{ marginBottom: 16 }}>
                  <span className="card-title" style={{ margin: 0 }}>Preview</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    setFile(null)
                    setPreviewUrl(null)
                    setEstimatedSize(null)
                    setCompressedSize(null)
                    pdfDocRef.current = null
                    pdfBytesRef.current = null
                  }}>
                    Change PDF
                  </button>
                </div>
                <div className="preview-panel">
                  {previewUrl ? (
                    <img src={previewUrl} alt="PDF Preview" />
                  ) : (
                    <div className="preview-placeholder">
                      <div className="preview-placeholder-icon">📄</div>
                      <div>Loading preview...</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Size Comparison */}
              <div className="card">
                <div className="card-title">📊 Size Comparison</div>
                <div className="compressor-size-grid">
                  <div className="compressor-size-box original">
                    <div className="compressor-size-label">Original Size</div>
                    <div className="compressor-size-value">{formatBytes(originalSize)}</div>
                  </div>
                  <div className="compressor-size-arrow">→</div>
                  <div className="compressor-size-box estimated">
                    <div className="compressor-size-label">
                      {compressedSize ? 'Actual Compressed' : 'Estimated Size'}
                      {estimating && <span className="compressor-estimating-dot" />}
                    </div>
                    <div className={`compressor-size-value size-indicator ${
                      compressedSize
                        ? getSizeColor(compressedSize / originalSize)
                        : estimatedSize
                        ? getSizeColor(estimatedSize / originalSize)
                        : ''
                    }`}>
                      {compressedSize
                        ? formatBytes(compressedSize)
                        : estimatedSize
                        ? `~${formatBytes(estimatedSize)}`
                        : '—'}
                    </div>
                  </div>
                </div>

                {/* Compression ratio bar */}
                {(compressionRatio !== null || actualRatio !== null) && (
                  <div className="compressor-ratio-section">
                    <div className="flex-between" style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {compressedSize ? 'Savings' : 'Est. Savings'}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-light)' }}>
                        {compressedSize ? actualRatio : compressionRatio}% smaller
                      </span>
                    </div>
                    <div className="progress-bar-container" style={{ height: 8 }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.max(0, Math.min(100, compressedSize ? actualRatio : compressionRatio))}%`,
                          background: 'linear-gradient(90deg, #34d399, #06b6d4)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="metadata-grid">
                <div className="metadata-item">
                  <div className="metadata-label">File Name</div>
                  <div className="metadata-value" style={{ fontSize: 13, wordBreak: 'break-all' }}>{file.name}</div>
                </div>
                <div className="metadata-item">
                  <div className="metadata-label">Pages</div>
                  <div className="metadata-value">{pageCount}</div>
                </div>
                <div className="metadata-item">
                  <div className="metadata-label">Original Size</div>
                  <div className="metadata-value">{formatBytes(originalSize)}</div>
                </div>
                <div className="metadata-item">
                  <div className="metadata-label">Quality Setting</div>
                  <div className="metadata-value">{quality}%</div>
                </div>
              </div>
            </div>

            {/* Right Panel — Controls */}
            <div className="tool-panel">
              {/* Quality Slider */}
              <div className="card">
                <div className="card-title">🎚️ Compression Quality</div>
                <div className="card-section">
                  <div className="form-group">
                    <div className="flex-between" style={{ marginBottom: 4 }}>
                      <label className="form-label" style={{ margin: 0 }}>Quality: {quality}%</label>
                      <span className={`badge ${qualityBadge}`}>{qualityLabel}</span>
                    </div>
                    <input
                      type="range"
                      className="range-slider"
                      min="5"
                      max="100"
                      step="1"
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                    />
                    <div className="flex-between" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      <span>Smallest file (5%)</span>
                      <span>Best quality (100%)</span>
                    </div>
                  </div>
                </div>
                <div className="presets-row">
                  {[
                    { label: 'Low (20%)', val: 20 },
                    { label: 'Medium (50%)', val: 50 },
                    { label: 'Good (70%)', val: 70 },
                    { label: 'High (85%)', val: 85 },
                    { label: 'Max (100%)', val: 100 },
                  ].map(p => (
                    <button
                      key={p.val}
                      className={`preset-chip ${quality === p.val ? 'active' : ''}`}
                      onClick={() => setQuality(p.val)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Live size indicator */}
                <div className="compressor-live-size" style={{ marginTop: 20 }}>
                  <div className="flex-between">
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {estimating ? 'Calculating...' : 'Estimated output:'}
                    </span>
                    <span className={`size-indicator ${
                      estimatedSize ? getSizeColor(estimatedSize / originalSize) : ''
                    }`} style={{ fontSize: 16, fontWeight: 700 }}>
                      {estimatedSize ? `~${formatBytes(estimatedSize)}` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resolution / DPI Scale */}
              <div className="card">
                <div className="card-title">🔍 Render Resolution</div>
                <div className="card-section">
                  <div className="form-group">
                    <label className="form-label">
                      Scale: {dpiScale.toFixed(1)}x ({Math.round(dpiScale * 72)} DPI)
                    </label>
                    <input
                      type="range"
                      className="range-slider"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={dpiScale}
                      onChange={(e) => setDpiScale(Number(e.target.value))}
                    />
                    <div className="flex-between" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      <span>Low res (smaller)</span>
                      <span>High res (larger)</span>
                    </div>
                  </div>
                </div>
                <div className="presets-row">
                  {DPI_PRESETS.map(p => (
                    <button
                      key={p.value}
                      className={`preset-chip ${dpiScale === p.value ? 'active' : ''}`}
                      onClick={() => setDpiScale(p.value)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compress Button */}
              <div className="card">
                <div className="card-title">⬇ Download</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                  Output will be compressed at exactly <strong style={{ color: 'var(--accent-light)' }}>{quality}%</strong> JPEG quality,
                  rendered at <strong style={{ color: 'var(--accent-light)' }}>{Math.round(dpiScale * 72)} DPI</strong>.
                  The filename will include the quality value for reference.
                </div>

                {processing && (
                  <div style={{ marginBottom: 16 }}>
                    <div className="flex-between" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Compressing...</span>
                      <span style={{ fontSize: 12, color: 'var(--accent-light)', fontWeight: 600 }}>{progress}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  onClick={handleCompress}
                  disabled={processing}
                >
                  {processing ? (
                    <><div className="spinner" /> Compressing ({progress}%)...</>
                  ) : (
                    `📦 Compress & Download (Q: ${quality}%)`
                  )}
                </button>

                {compressedSize !== null && (
                  <div className="compressor-result-banner">
                    <div className="compressor-result-icon">✅</div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Compression Complete!</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {formatBytes(originalSize)} → {formatBytes(compressedSize)} ({actualRatio}% smaller)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

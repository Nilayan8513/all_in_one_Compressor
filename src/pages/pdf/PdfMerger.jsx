import { useState, useCallback } from 'react'
import { PDFDocument } from 'pdf-lib'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

export default function PdfMerger() {
  const [files, setFiles] = useState([]) // [{file, name, pages, id}]
  const [processing, setProcessing] = useState(false)

  const handleFiles = useCallback(async (newFiles) => {
    const entries = []
    for (const f of newFiles) {
      try {
        const buffer = await f.arrayBuffer()
        const pdf = await PDFDocument.load(buffer)
        entries.push({
          file: f,
          buffer,
          name: f.name,
          pages: pdf.getPageCount(),
          id: Date.now() + Math.random(),
        })
      } catch (err) {
        console.error(`Failed to load ${f.name}:`, err)
      }
    }
    setFiles(prev => [...prev, ...entries])
  }, [])

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const moveFile = (index, direction) => {
    setFiles(prev => {
      const next = [...prev]
      const newIndex = index + direction
      if (newIndex < 0 || newIndex >= next.length) return prev
      ;[next[index], next[newIndex]] = [next[newIndex], next[index]]
      return next
    })
  }

  const handleMerge = useCallback(async () => {
    if (files.length < 2) return
    setProcessing(true)

    try {
      const merged = await PDFDocument.create()

      for (const entry of files) {
        const src = await PDFDocument.load(entry.buffer)
        const pages = await merged.copyPages(src, src.getPageIndices())
        pages.forEach(page => merged.addPage(page))
      }

      const pdfBytes = await merged.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'merged.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Merge failed:', err)
    }
    setProcessing(false)
  }, [files])

  const totalPages = files.reduce((sum, f) => sum + f.pages, 0)

  return (
    <div className="animate-in">
      <PageHeader
        icon="📑"
        iconClass="pdf"
        title="PDF Merger"
        description="Combine multiple PDFs into one — drag to reorder"
      />
      <div className="page-body">
        <div style={{ maxWidth: 700, width: '100%', margin: '0 auto' }}>
          <FileDropzone
            accept="application/pdf"
            multiple
            onFiles={handleFiles}
            label="Drop PDFs here or"
            hint="Upload multiple PDF files to merge"
            maxSize={15 * 1024 * 1024}
          />

          {files.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div className="flex-between" style={{ marginBottom: 16 }}>
                <span style={{ fontWeight: 600 }}>
                  {files.length} file{files.length !== 1 ? 's' : ''} • {totalPages} total pages
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setFiles([])}>Clear All</button>
              </div>

              <div className="file-list" style={{ marginBottom: 24 }}>
                {files.map((f, i) => (
                  <div key={f.id} className="file-item">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button
                        className="btn btn-ghost btn-icon"
                        style={{ width: 24, height: 20, fontSize: 10 }}
                        onClick={() => moveFile(i, -1)}
                        disabled={i === 0}
                      >▲</button>
                      <button
                        className="btn btn-ghost btn-icon"
                        style={{ width: 24, height: 20, fontSize: 10 }}
                        onClick={() => moveFile(i, 1)}
                        disabled={i === files.length - 1}
                      >▼</button>
                    </div>
                    <div className="file-item-icon" style={{ background: 'rgba(251,146,60,0.1)', color: 'var(--pdf-accent)' }}>📄</div>
                    <div className="file-item-info">
                      <div className="file-item-name">{f.name}</div>
                      <div className="file-item-size">{f.pages} pages</div>
                    </div>
                    <button className="file-item-remove" onClick={() => removeFile(f.id)}>✕</button>
                  </div>
                ))}
              </div>

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={handleMerge}
                disabled={processing || files.length < 2}
              >
                {processing ? <><div className="spinner" /> Merging...</> : '⬇ Merge & Download PDF'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

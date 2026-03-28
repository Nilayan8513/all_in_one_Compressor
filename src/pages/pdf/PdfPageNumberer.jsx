import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

const POSITIONS = [
  { label: 'Bottom Center', value: 'bottom-center' },
  { label: 'Bottom Right', value: 'bottom-right' },
  { label: 'Bottom Left', value: 'bottom-left' },
]

const FORMATS = [
  { label: 'Page 1 of N', value: 'full' },
  { label: 'Just number (1)', value: 'num' },
]

export default function PdfPageNumberer() {
  const [file, setFile] = useState(null)
  const [position, setPosition] = useState('bottom-center')
  const [fontSize, setFontSize] = useState(12)
  const [startNum, setStartNum] = useState(1)
  const [format, setFormat] = useState('full')
  const [processing, setProcessing] = useState(false)

  const handleFiles = useCallback((files) => {
    const f = files[0]
    if (!f || f.type !== 'application/pdf') return toast.error('Please upload a PDF file')
    setFile(f)
  }, [])

  const handleApply = useCallback(async () => {
    if (!file) return
    setProcessing(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
      const doc = await PDFDocument.load(arrayBuffer)
      const font = await doc.embedFont(StandardFonts.Helvetica)
      const pages = doc.getPages()
      const total = pages.length

      pages.forEach((page, i) => {
        const { width, height } = page.getSize()
        const num = i + startNum
        const label = format === 'full' ? `Page ${num} of ${total + startNum - 1}` : String(num)
        const textWidth = font.widthOfTextAtSize(label, fontSize)
        let x, y
        if (position === 'bottom-center') { x = (width - textWidth) / 2; y = 20 }
        else if (position === 'bottom-right') { x = width - textWidth - 20; y = 20 }
        else { x = 20; y = 20 }
        page.drawText(label, { x, y, size: fontSize, font, color: rgb(0.4, 0.4, 0.4) })
      })

      const pdfBytes = await doc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'numbered_' + file.name
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`✅ Page numbers added to ${total} pages!`)
    } catch (err) {
      toast.error('Failed: ' + err.message)
    }
    setProcessing(false)
  }, [file, position, fontSize, startNum, format])

  return (
    <div className="animate-in">
      <PageHeader icon="🔢" iconClass="pdf" title="PDF Page Numberer" description="Stamp page numbers onto every page of a PDF" />
      <div className="page-body">
        <div style={{ width: '100%', maxWidth: 560 }}>
          {!file ? (
            <FileDropzone accept="application/pdf" onFiles={handleFiles} label="Drop a PDF here or" hint="Page numbers will be stamped on each page" />
          ) : (
            <>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="flex-between">
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setFile(null)}>Change</button>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">Numbering Options</div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Format</label>
                  <div className="tabs">
                    {FORMATS.map(f => (
                      <button key={f.value} className={`tab ${format === f.value ? 'active' : ''}`} onClick={() => setFormat(f.value)}>{f.label}</button>
                    ))}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Position</label>
                  <select className="form-select" value={position} onChange={e => setPosition(e.target.value)}>
                    {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Font Size: {fontSize}pt</label>
                    <input type="range" className="range-slider" min="8" max="24" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Start Number</label>
                    <input type="number" className="form-input" min="0" value={startNum} onChange={e => setStartNum(Number(e.target.value))} />
                  </div>
                </div>
              </div>

              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleApply} disabled={processing}>
                {processing ? <><div className="spinner" /> Adding numbers...</> : '🔢 Add Page Numbers & Download'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

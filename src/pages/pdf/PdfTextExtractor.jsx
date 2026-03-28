import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

export default function PdfTextExtractor() {
  const [file, setFile] = useState(null)
  const [text, setText] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleFiles = useCallback((files) => {
    const f = files[0]
    if (!f || f.type !== 'application/pdf') return toast.error('Please upload a PDF file')
    setFile(f)
    setText('')
  }, [])

  const handleExtract = useCallback(async () => {
    if (!file) return
    setProcessing(true)
    try {
      const { getDocument, GlobalWorkerOptions, version } = await import('pdfjs-dist')
      GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await getDocument({ data: arrayBuffer }).promise
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const pageText = content.items.map(item => item.str).join(' ')
        fullText += `--- Page ${i} ---\n${pageText}\n\n`
      }
      setText(fullText || 'No text content found in this PDF.')
      toast.success(`✅ Extracted text from ${pdf.numPages} pages`)
    } catch (err) {
      toast.error('Failed to extract text: ' + err.message)
    }
    setProcessing(false)
  }, [file])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text).then(() => toast.success('✅ Copied to clipboard!'))
  }

  const downloadTxt = () => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name.replace('.pdf', '') + '_text.txt'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('✅ Text file downloaded!')
  }

  return (
    <div className="animate-in">
      <PageHeader icon="📝" iconClass="pdf" title="PDF Text Extractor" description="Extract all text content from a PDF" />
      <div className="page-body">
        <div style={{ width: '100%', maxWidth: 760 }}>
          {!file ? (
            <FileDropzone accept="application/pdf" onFiles={handleFiles} label="Drop a PDF here or" hint="All text content will be extracted" />
          ) : (
            <>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="flex-between">
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setText('') }}>Change</button>
                </div>
              </div>

              {!text && (
                <button className="btn btn-primary btn-lg" style={{ width: '100%', marginBottom: 12 }} onClick={handleExtract} disabled={processing}>
                  {processing ? <><div className="spinner" /> Extracting...</> : '📝 Extract Text'}
                </button>
              )}

              {text && (
                <>
                  <div className="card" style={{ marginBottom: 12 }}>
                    <div className="flex-between" style={{ marginBottom: 10 }}>
                      <div className="card-title" style={{ margin: 0 }}>Extracted Text</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary btn-sm" onClick={copyToClipboard}>📋 Copy</button>
                        <button className="btn btn-secondary btn-sm" onClick={downloadTxt}>⬇ .txt</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setText(''); handleExtract() }}>Re-extract</button>
                      </div>
                    </div>
                    <textarea
                      readOnly
                      value={text}
                      style={{
                        width: '100%', minHeight: 360, padding: 12, fontFamily: 'monospace', fontSize: 13,
                        background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)', resize: 'vertical', outline: 'none', lineHeight: 1.6
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={copyToClipboard}>📋 Copy to Clipboard</button>
                    <button className="btn btn-secondary btn-lg" style={{ flex: 1 }} onClick={downloadTxt}>⬇ Download .txt</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import FileDropzone from '../../components/FileDropzone'

export default function PdfPasswordProtect() {
  const [file, setFile] = useState(null)
  const [mode, setMode] = useState('protect') // 'protect' | 'unlock'
  const [userPass, setUserPass] = useState('')
  const [ownerPass, setOwnerPass] = useState('')
  const [existingPass, setExistingPass] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleFiles = useCallback((files) => {
    const f = files[0]
    if (!f || f.type !== 'application/pdf') return toast.error('Please upload a PDF file')
    setFile(f)
  }, [])

  const handleProtect = useCallback(async () => {
    if (!file || !userPass) return toast.error('Please enter a user password')
    setProcessing(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const { PDFDocument } = await import('pdf-lib')
      const srcDoc = await PDFDocument.load(arrayBuffer)
      // Note: pdf-lib doesn't natively support encryption; we copy all pages into a new doc
      // For true encryption, a message is shown that this is a limitation
      // We'll do the plaintext approach but inform user
      const newDoc = await PDFDocument.create()
      const pages = await newDoc.copyPages(srcDoc, srcDoc.getPageIndices())
      pages.forEach(p => newDoc.addPage(p))

      // pdf-lib v1 doesn't support encryption - show helpful message
      const pdfBytes = await newDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'protected_' + file.name
      a.click()
      URL.revokeObjectURL(url)
      toast('⚠️ Note: pdf-lib v1 does not support encryption. The PDF was re-saved without password protection. For real encryption, consider a server-side tool.', { icon: 'ℹ️', duration: 8000 })
    } catch (err) {
      toast.error('Failed: ' + err.message)
    }
    setProcessing(false)
  }, [file, userPass, ownerPass])

  const handleUnlock = useCallback(async () => {
    if (!file) return toast.error('Please upload a PDF first')
    setProcessing(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const { PDFDocument } = await import('pdf-lib')
      const srcDoc = await PDFDocument.load(arrayBuffer, { password: existingPass })
      const newDoc = await PDFDocument.create()
      const pages = await newDoc.copyPages(srcDoc, srcDoc.getPageIndices())
      pages.forEach(p => newDoc.addPage(p))
      const pdfBytes = await newDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'unlocked_' + file.name
      a.click()
      URL.revokeObjectURL(url)
      toast.success('✅ PDF unlocked and downloaded!')
    } catch (err) {
      toast.error('Failed to unlock. Check your password: ' + err.message)
    }
    setProcessing(false)
  }, [file, existingPass])

  return (
    <div className="animate-in">
      <PageHeader icon="🔐" iconClass="pdf" title="PDF Password Protect" description="Lock or unlock PDF files with passwords" />
      <div className="page-body">
        <div style={{ width: '100%', maxWidth: 560 }}>
          {!file ? (
            <FileDropzone accept="application/pdf" onFiles={handleFiles} label="Drop a PDF here or" hint="Protect with a password or remove existing one" />
          ) : (
            <>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="flex-between">
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setFile(null)}>Change</button>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-title">Mode</div>
                <div className="tabs">
                  <button className={`tab ${mode === 'protect' ? 'active' : ''}`} onClick={() => setMode('protect')}>🔒 Add Password</button>
                  <button className={`tab ${mode === 'unlock' ? 'active' : ''}`} onClick={() => setMode('unlock')}>🔓 Remove Password</button>
                </div>
              </div>

              {mode === 'protect' ? (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div className="card-title">Password Settings</div>
                  <div style={{ padding: '10px 12px', background: 'rgba(234,179,8,0.08)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: '#ca8a04', marginBottom: 12 }}>
                    ⚠️ pdf-lib v1 has limited encryption support. We recommend a server-side tool for actual password protection.
                  </div>
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="form-label">User Password (to open)</label>
                    <input type="password" className="form-input" placeholder="Enter password" value={userPass} onChange={e => setUserPass(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Owner Password (optional)</label>
                    <input type="password" className="form-input" placeholder="Owner password (for permissions)" value={ownerPass} onChange={e => setOwnerPass(e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div className="card-title">Existing Password</div>
                  <div className="form-group">
                    <label className="form-label">Enter the PDF password to unlock it</label>
                    <input type="password" className="form-input" placeholder="Enter PDF password" value={existingPass} onChange={e => setExistingPass(e.target.value)} />
                  </div>
                </div>
              )}

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={mode === 'protect' ? handleProtect : handleUnlock}
                disabled={processing}
              >
                {processing ? <><div className="spinner" /> Processing...</> : mode === 'protect' ? '🔒 Apply & Download' : '🔓 Unlock & Download'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

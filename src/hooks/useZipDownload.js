import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export function useZipDownload() {
  const downloadZip = async (files, zipName = 'download.zip') => {
    const zip = new JSZip()
    for (const { filename, blob } of files) {
      zip.file(filename, blob)
    }
    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, zipName)
  }
  return { downloadZip }
}

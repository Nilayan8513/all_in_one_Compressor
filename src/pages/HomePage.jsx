import { Link } from 'react-router-dom'

const modules = [
  {
    type: 'image',
    icon: '🖼️',
    title: 'Image Tools',
    desc: 'Compress, resize, and convert images with ease.',
    features: ['Image Compressor', 'Image Resize (px, cm, mm, in)', 'Format Conversion'],
    link: '/image/compress'
  },
  {
    type: 'pdf',
    icon: '📄',
    title: 'PDF Workshop',
    desc: 'Merge, compress, and convert PDFs with zero uploads.',
    features: ['PDF Compressor', 'PDF Merger', 'PDF → Image', 'Image → PDF'],
    link: '/pdf/compress'
  },
  {
    type: 'audio',
    icon: '🎵',
    title: 'Audio Lab',
    desc: 'Convert formats, trim tracks, and apply effects in-browser.',
    features: ['Format Converter', 'Waveform Trim & Cut', 'Fade Effects'],
    link: '/audio/convert'
  }
]

export default function HomePage() {
  return (
    <div className="home-page animate-in">
      <div className="home-hero">

        <h1 className="home-title">
          All in One{' '}
          <span className="home-title-accent">Compressor.</span>
        </h1>
        <p className="home-subtitle">
          Compress, convert, and edit images, PDFs, and audio — all without uploading a single file.
        </p>
      </div>

      <div className="home-modules">
        {modules.map((mod, i) => (
          <Link
            key={mod.type}
            to={mod.link}
            className={`home-module-card ${mod.type} animate-in stagger-${i + 1}`}
          >
            <div className="home-module-icon">{mod.icon}</div>
            <div className="home-module-title">{mod.title}</div>
            <div className="home-module-desc">{mod.desc}</div>
            <div className="home-module-features">
              {mod.features.map(f => (
                <div key={f} className="home-module-feature">
                  <span style={{ color: 'var(--accent)', fontSize: 10 }}>●</span>
                  {f}
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

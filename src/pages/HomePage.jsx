import { Link, useNavigate } from 'react-router-dom'

const modules = [
  {
    type: 'image',
    icon: '🖼️',
    title: 'Image Tools',
    desc: 'Compress, resize, and convert images with ease.',
    features: [
      { label: 'Image Compressor', path: '/image/compress' },
      { label: 'Image Resize', path: '/image/resize' }
    ],
    link: '/image/compress'
  },
  {
    type: 'pdf',
    icon: '📄',
    title: 'PDF Workshop',
    desc: 'Merge, compress, and convert PDFs with zero uploads.',
    features: [
      { label: 'PDF Compressor', path: '/pdf/compress' },
      { label: 'PDF Merger', path: '/pdf/merge' },
      { label: 'PDF → Image', path: '/pdf/to-image' },
      { label: 'Image → PDF', path: '/pdf/from-image' }
    ],
    link: '/pdf/compress'
  },
  {
    type: 'audio',
    icon: '🎵',
    title: 'Audio Lab',
    desc: 'Convert formats, trim tracks, and apply effects in-browser.',
    features: [
      { label: 'Format Converter', path: '/audio/convert' },
      { label: 'Trim & Cut', path: '/audio/trim' }
    ],
    link: '/audio/convert'
  }
]

export default function HomePage() {
  const navigate = useNavigate()
  
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
          <div
            key={mod.type}
            className={`home-module-card ${mod.type} animate-in stagger-${i + 1}`}
            onClick={() => navigate(mod.link)}
            style={{ cursor: 'pointer' }}
          >
            <div className="home-module-icon">{mod.icon}</div>
            <div className="home-module-title">{mod.title}</div>
            <div className="home-module-desc">{mod.desc}</div>
            <div className="home-module-features">
              {mod.features.map(f => (
                <div key={f.label} className="home-module-feature">
                  <span style={{ color: 'var(--accent)', fontSize: 10 }}>●</span>
                  <Link 
                    to={f.path} 
                    onClick={(e) => e.stopPropagation()} 
                    style={{ textDecoration: 'none', color: 'inherit' }}
                    className="feature-link"
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    {f.label}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

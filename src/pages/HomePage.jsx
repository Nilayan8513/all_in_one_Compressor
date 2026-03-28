import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const modules = [
  {
    type: 'image',
    icon: '🖼️',
    title: 'Image Tools',
    color: '#3b82f6',
    colorSubtle: 'rgba(59,130,246,0.08)',
    desc: 'Compress, resize, convert & watermark — all in browser.',
    features: [
      { label: 'Compressor', icon: '📦', path: '/image/compress', desc: 'DPI & quality control' },
      { label: 'Resize', icon: '📐', path: '/image/resize', desc: 'Exact dimensions' },
      { label: 'Format Convert', icon: '🔀', path: '/image/convert', desc: 'JPG / PNG / WebP / AVIF' },
      { label: 'Metadata Strip', icon: '🔏', path: '/image/metadata-strip', desc: 'Remove EXIF / GPS' },
    ],
    link: '/image/compress',
  },
  {
    type: 'pdf',
    icon: '📄',
    title: 'PDF Workshop',
    color: '#f59e0b',
    colorSubtle: 'rgba(245,158,11,0.08)',
    desc: 'Merge, split, compress & edit PDF pages — zero uploads.',
    features: [
      { label: 'Compressor', icon: '📦', path: '/pdf/compress', desc: 'Reduce PDF size' },
      { label: 'Merger', icon: '📑', path: '/pdf/merge', desc: 'Combine PDFs' },
      { label: 'Splitter', icon: '✂️', path: '/pdf/split', desc: 'Extract pages' },
      { label: 'PDF → Image', icon: '🖼️', path: '/pdf/to-image', desc: 'Pages to images' },
      { label: 'Image → PDF', icon: '📄', path: '/pdf/from-image', desc: 'Bundle images' },
      { label: 'Reorder Pages', icon: '↕️', path: '/pdf/reorder', desc: 'Drag & drop order' },
      { label: 'Page Numbers', icon: '🔢', path: '/pdf/number', desc: 'Stamp numbering' },
    ],
    link: '/pdf/compress',
  },
  {
    type: 'audio',
    icon: '🎵',
    title: 'Audio Lab',
    color: '#a855f7',
    colorSubtle: 'rgba(168,85,247,0.08)',
    desc: 'Convert, trim, merge & adjust volume — via ffmpeg.wasm.',
    features: [
      { label: 'Format Convert', icon: '🔄', path: '/audio/convert', desc: 'MP3 / WAV / OGG / FLAC' },
      { label: 'Trim & Cut', icon: '✂️', path: '/audio/trim', desc: 'Exact timestamps' },
      { label: 'Volume', icon: '🔊', path: '/audio/volume', desc: 'Boost or reduce' },
      { label: 'Merger', icon: '🎶', path: '/audio/merge', desc: 'Combine tracks' },
    ],
    link: '/audio/convert',
  },
  {
    type: 'utility',
    icon: '🛠️',
    title: 'Utilities',
    color: '#10b981',
    colorSubtle: 'rgba(16,185,129,0.08)',
    desc: 'Browser-based QR generator and Base64 converter.',
    features: [
      { label: 'QR Code', icon: '⊞', path: '/utilities/qrcode', desc: 'Custom color QRs' },
      { label: 'Base64', icon: '⇄', path: '/utilities/base64', desc: 'Image ↔ Base64' },
    ],
    link: '/utilities/qrcode',
  },
]

export default function HomePage() {
  const [active, setActive] = useState('image')
  const navigate = useNavigate()
  const current = modules.find(m => m.type === active)

  return (
    <div className="home-v2">
      {/* HERO */}
      <div className="hv2-hero">
        <h1 className="hv2-title">
          All‑in‑One <span className="hv2-accent">File Suite</span>
        </h1>
        <p className="hv2-sub">21 client-side tools — images, PDFs, audio. Zero uploads. 100% private.</p>
        <div className="hv2-stats">
          <div className="hv2-stat"><span className="hv2-num">21</span><span className="hv2-lbl">Tools</span></div>
          <div className="hv2-divider" />
          <div className="hv2-stat"><span className="hv2-num">4</span><span className="hv2-lbl">Categories</span></div>
          <div className="hv2-divider" />
          <div className="hv2-stat"><span className="hv2-num">100%</span><span className="hv2-lbl">Local</span></div>
          <div className="hv2-divider" />
          <div className="hv2-stat"><span className="hv2-num">0</span><span className="hv2-lbl">Uploads</span></div>
        </div>
      </div>

      {/* TOOL EXPLORER — single panel with tabs at top */}
      <div className="hv2-panel" key={active}>
        {/* Tabs row at top of the box */}
        <div className="hv2-tabs">
          {modules.map(m => (
            <button
              key={m.type}
              className={`hv2-tab ${active === m.type ? 'active' : ''}`}
              style={active === m.type ? { '--tab-color': m.color, '--tab-subtle': m.colorSubtle } : {}}
              onClick={() => setActive(m.type)}
            >
              <span className="hv2-tab-icon">{m.icon}</span>
              <span className="hv2-tab-label">{m.title}</span>
              <span className="hv2-tab-count">{m.features.length}</span>
            </button>
          ))}
        </div>

        {/* Category header */}
        <div className="hv2-panel-head">
          <div className="hv2-panel-icon" style={{ background: current.colorSubtle, color: current.color }}>
            {current.icon}
          </div>
          <div>
            <div className="hv2-panel-title">{current.title}</div>
            <div className="hv2-panel-desc">{current.desc}</div>
          </div>
        </div>

        {/* Tool pills */}
        <div className="hv2-tools">
          {current.features.map(f => (
            <Link
              key={f.path}
              to={f.path}
              className="hv2-tool"
              style={{ '--tool-color': current.color, '--tool-subtle': current.colorSubtle }}
            >
              <span className="hv2-tool-icon">{f.icon}</span>
              <span className="hv2-tool-body">
                <span className="hv2-tool-name">{f.label}</span>
                <span className="hv2-tool-desc">{f.desc}</span>
              </span>
              <span className="hv2-tool-arrow">→</span>
            </Link>
          ))}
        </div>

        <button
          className="hv2-cta"
          style={{ background: current.color }}
          onClick={() => navigate(current.link)}
        >
          Open {current.title} →
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ImageCompressor from './pages/image/ImageCompressor'
import ImageResize from './pages/image/ImageResize'
import PdfMerger from './pages/pdf/PdfMerger'
import PdfToImage from './pages/pdf/PdfToImage'
import ImageToPdf from './pages/pdf/ImageToPdf'
import PdfCompressor from './pages/pdf/PdfCompressor'
import AudioConverter from './pages/audio/AudioConverter'
import AudioTrimmer from './pages/audio/AudioTrimmer'

function App() {
  const location = useLocation()
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [openSection, setOpenSection] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerSection, setDrawerSection] = useState(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    setOpenSection(null)
    setDrawerOpen(false)
    setDrawerSection(null)
  }, [location.pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const navSections = [
    {
      label: 'Image Tools',
      icon: '🖼️',
      items: [
        { path: '/image/compress', icon: '📦', label: 'Image Compressor' },
        { path: '/image/resize', icon: '📐', label: 'Image Resize' },
      ]
    },
    {
      label: 'PDF Workshop',
      icon: '📄',
      items: [
        { path: '/pdf/compress', icon: '📦', label: 'PDF Compressor' },
        { path: '/pdf/merge', icon: '📑', label: 'PDF Merger' },
        { path: '/pdf/to-image', icon: '🖼️', label: 'PDF → Image' },
        { path: '/pdf/from-image', icon: '📄', label: 'Image → PDF' },
      ]
    },
    {
      label: 'Audio Lab',
      icon: '🎵',
      items: [
        { path: '/audio/convert', icon: '🔄', label: 'Format Converter' },
        { path: '/audio/trim', icon: '✂️', label: 'Trim & Cut' },
      ]
    }
  ]

  const hoverLock = useRef(false)

  const handleSectionToggle = (label) => {
    setOpenSection(prev => prev === label ? null : label)
  }

  const handleItemClick = () => {
    setOpenSection(null)
    hoverLock.current = true
    setTimeout(() => { hoverLock.current = false }, 300)
  }

  const isPathInSection = (section) => {
    return section.items.some(item => location.pathname === item.path)
  }

  const toggleDrawerSection = (label) => {
    setDrawerSection(prev => prev === label ? null : label)
  }

  return (
    <div className="app-layout">
      <header className="topbar">
        <NavLink to="/" className="topbar-logo">
          <div className="topbar-logo-icon">⚡</div>
          <div>
            <div className="topbar-logo-text">All in One</div>
            <div className="topbar-logo-sub">Compressor</div>
          </div>
        </NavLink>

        {/* Desktop nav — hidden on mobile via CSS */}
        <nav className="topbar-nav">
          {navSections.map(section => (
            <div
              key={section.label}
              className={`topbar-section ${openSection === section.label ? 'open' : ''}`}
              onMouseEnter={() => { if (!hoverLock.current) setOpenSection(section.label) }}
              onMouseLeave={() => { setOpenSection(null); hoverLock.current = false }}
            >
              <button
                className={`topbar-section-btn ${isPathInSection(section) ? 'active' : ''}`}
                onClick={() => handleSectionToggle(section.label)}
              >
                <span className="section-icon">{section.icon}</span>
                <span className="section-label">{section.label}</span>
              </button>

              <div className="topbar-dropdown">
                {section.items.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `topbar-dropdown-item ${isActive ? 'active' : ''}`}
                    onClick={handleItemClick}
                  >
                    <span className="dd-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="topbar-right">
          <div className="topbar-privacy">
            🔒 Private &amp; Secure
          </div>
          <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {/* Hamburger — mobile only */}
          <button
            className="hamburger-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
      )}

      {/* Mobile Side Drawer */}
      <div className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-logo">
            <div className="topbar-logo-icon">⚡</div>
            <div>
              <div className="topbar-logo-text">All in One</div>
              <div className="topbar-logo-sub">Compressor</div>
            </div>
          </div>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>

        <nav className="drawer-nav">
          {navSections.map(section => (
            <div key={section.label} className="drawer-section">
              <button
                className={`drawer-section-btn ${isPathInSection(section) ? 'active' : ''} ${drawerSection === section.label ? 'open' : ''}`}
                onClick={() => toggleDrawerSection(section.label)}
              >
                <span className="drawer-section-left">
                  <span>{section.icon}</span>
                  <span>{section.label}</span>
                </span>
                <span className={`drawer-chevron ${drawerSection === section.label ? 'open' : ''}`}>▾</span>
              </button>

              <div className={`drawer-items ${drawerSection === section.label ? 'open' : ''}`}>
                {section.items.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `drawer-item ${isActive ? 'active' : ''}`}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="drawer-footer">
          <button className="drawer-theme-btn" onClick={toggleTheme}>
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
        </div>
      </div>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/image/compress" element={<ImageCompressor />} />
          <Route path="/image/resize" element={<ImageResize />} />
          <Route path="/pdf/compress" element={<PdfCompressor />} />
          <Route path="/pdf/merge" element={<PdfMerger />} />
          <Route path="/pdf/to-image" element={<PdfToImage />} />
          <Route path="/pdf/from-image" element={<ImageToPdf />} />
          <Route path="/audio/convert" element={<AudioConverter />} />
          <Route path="/audio/trim" element={<AudioTrimmer />} />
        </Routes>
      </main>
    </div>
  )
}

export default App

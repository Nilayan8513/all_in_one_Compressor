<div align="center">

# ⚡ All in One Compressor

### Compress · Resize · Convert — Right in Your Browser

[![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-ff69b4?style=for-the-badge)](https://github.com/Nilayan8513/all_in_one_resizer/pulls)

> 🔒 **100% Private & Secure** — Every file is processed locally in your browser.  
> Nothing is ever uploaded to any server.

---

</div>

## ✨ Features

### 🖼️ Image Tools
| Tool | Description |
|------|------------|
| **Image Compressor** | Adjust DPI, quality, and format (JPG/PNG/WEBP) with real-time file size estimation |
| **Image Resize** | Precise dimensions in **px, cm, mm, inches** with aspect ratio lock & live unit conversion |

### 📄 PDF Workshop
| Tool | Description |
|------|------------|
| **PDF Compressor** | Quality slider + render resolution control with real-time size comparison |
| **PDF Merger** | Drag & drop to combine multiple PDFs into one |
| **PDF → Image** | Export PDF pages as high-quality images |
| **Image → PDF** | Convert images into a single PDF document |

### 🎵 Audio Lab
| Tool | Description |
|------|------------|
| **Format Converter** | Convert between audio formats (MP3, WAV, OGG, etc.) |
| **Trim & Cut** | Waveform-based audio trimming with draggable handles |

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Nilayan8513/all_in_one_resizer.git

# Navigate to the project
cd all_in_one_resizer

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> 📱 **Mobile Access:** Run `npm run dev -- --host` and open the Network URL on your phone (same WiFi).

---

## 🏗️ Tech Stack

<div align="center">

| Technology | Purpose |
|:---:|:---:|
| ⚛️ **React 19** | UI Framework |
| ⚡ **Vite 8** | Build Tool |
| 🎨 **Vanilla CSS** | Styling (Dark/Light themes) |
| 📄 **pdf-lib** | PDF manipulation |
| 📑 **pdfjs-dist** | PDF rendering |
| 🎵 **ffmpeg.wasm** | Audio processing |
| 🖼️ **Canvas API** | Image processing |

</div>

---

## 📁 Project Structure

```
src/
├── App.jsx                    # Main app with routing & navigation
├── index.css                  # Complete design system & styles
├── components/
│   ├── FileDropzone.jsx       # Reusable drag & drop component
│   └── PageHeader.jsx         # Page header component
├── pages/
│   ├── HomePage.jsx           # Landing page
│   ├── image/
│   │   ├── ImageCompressor.jsx  # DPI + quality compression
│   │   └── ImageResize.jsx      # Dimension-based resizing
│   ├── pdf/
│   │   ├── PdfCompressor.jsx    # PDF quality compression
│   │   ├── PdfMerger.jsx        # Merge multiple PDFs
│   │   ├── PdfToImage.jsx       # PDF to image export
│   │   └── ImageToPdf.jsx       # Images to PDF
│   └── audio/
│       ├── AudioConverter.jsx   # Audio format conversion
│       └── AudioTrimmer.jsx     # Waveform trimming
```

---

## 🎨 Design Highlights

- **🌓 Dark & Light Mode** — Toggle with one click, preferences saved locally
- **📱 Fully Responsive** — Optimized for desktop (side-by-side layout) and mobile (stacked)
- **🎯 Side-by-Side Tool Layout** — Preview on the left, controls on the right (desktop)
- **🔄 Real-time Previews** — See changes instantly before exporting
- **💧 Fluid Animations** — Smooth transitions and micro-interactions
- **🎨 Blue & White Aesthetic** — Clean, modern, and professional

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

```bash
# Fork the repo, create a branch, make changes, then:
git checkout -b feature/amazing-feature
git commit -m "Add amazing feature"
git push origin feature/amazing-feature
```

---

<div align="center">

### Made with ❤️ by [Nilayan](https://github.com/Nilayan8513)

⭐ **Star this repo** if you found it useful!

</div>

import { useCallback, useEffect, useRef, useState } from 'react'
import Flipbook from './Flipbook.jsx'
import { primeSound, warmSound } from './sound.js'

const base = import.meta.env.BASE_URL

// Page order requested: 2, 3, 4, 1 of the source PDF.
const SITE_URL = 'https://www.qffrguktn.com'

const PAGES = [
  { src: `${base}pages/page-1-cover.webp`, srcMd: `${base}pages/page-1-cover-md.webp`, alt: 'Invitation cover: inaugural ceremony of Plus Qiskit Fall Fest 26, 5 October 2026, 2:00 PM to 3:00 PM, RGUKT Nuzvid' },
  { src: `${base}pages/page-2-schedule.webp`, srcMd: `${base}pages/page-2-schedule-md.webp`, alt: 'Event schedule, 5 to 9 October 2026' },
  { src: `${base}pages/page-3-speakers.webp`, srcMd: `${base}pages/page-3-speakers-md.webp`, alt: 'List of speakers' },
  { src: `${base}pages/page-4-about.webp`, srcMd: `${base}pages/page-4-about-md.webp`, alt: 'About RGUKT and Plus Qiskit Fall Fest 26, contact details and venue QR code' },
]

const PAGE_NAMES = ['Invitation', 'Event schedule', 'Speakers', 'About']
const SPREAD_NAMES = ['Invitation', 'Event schedule & speakers', 'About']

const Icon = {
  prev: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  ),
  next: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  ),
  soundOn: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" />
      <path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" />
    </svg>
  ),
  soundOff: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </svg>
  ),
  full: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  ),
  exitFull: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </svg>
  ),
}

export default function App() {
  const book = useRef(null)
  const [ready, setReady] = useState(false)
  const [state, setState] = useState({ pageIndex: 0, spreadIndex: 0, spreadCount: 3, pageCount: 4, mode: 'landscape' })
  const [sound, setSound] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [touched, setTouched] = useState(false)
  const firstSpread = useRef(0)

  const handleChange = useCallback((s) => {
    setState(s)
    if (s.spreadIndex !== firstSpread.current) setTouched(true)
  }, [])

  const next = () => book.current?.next()
  const prev = () => book.current?.prev()

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') next()
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') prev()
    }
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement))
    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFs)
    // Browsers only allow audio after a gesture; set it up now so the first page turn is smooth.
    window.addEventListener('pointerdown', primeSound, { once: true, passive: true })
    window.addEventListener('touchstart', primeSound, { once: true, passive: true })
    window.addEventListener('keydown', primeSound, { once: true, passive: true })
    return () => {
      window.removeEventListener('pointerdown', primeSound)
      window.removeEventListener('touchstart', primeSound)
      window.removeEventListener('keydown', primeSound)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFs)
    }
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.()
  }

  const canPrev = state.spreadIndex > 0
  const canNext = state.spreadIndex < state.spreadCount - 1
  const label =
    state.mode === 'portrait' ? PAGE_NAMES[state.pageIndex] : SPREAD_NAMES[state.spreadIndex]

  return (
    <div className="app" data-mode={state.mode}>
      <header className="top">
        <div className="nav-pill">
          <a className="brand" href={SITE_URL} target="_blank" rel="noopener noreferrer" aria-label="Plus Qiskit Fall Fest website">
            <img className="logo-person" src={`${base}logo-rgukt.png`} alt="" width="36" height="44" />
            <img className="logo-badge" src={`${base}logo-qff.png`} alt="" width="40" height="40" />
            <span className="brand-text">
              <span className="l1">Plus Qiskit</span> <span className="l2">Fall Fest</span>
            </span>
          </a>

          <a className="site-link" href={SITE_URL} target="_blank" rel="noopener noreferrer">
            qffrguktn.com
          </a>

          <div className="tools">
            <button
              type="button"
              className="tool-btn plain"
              onClick={() => setSound((v) => !v)}
              aria-pressed={sound}
              aria-label={sound ? 'Mute page-turn sound' : 'Turn on page-turn sound'}
              title={sound ? 'Mute page-turn sound' : 'Turn on page-turn sound'}
            >
              {sound ? Icon.soundOn : Icon.soundOff}
            </button>
            <button
              type="button"
              className="tool-btn chip"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
              title={fullscreen ? 'Exit full screen' : 'Full screen'}
            >
              {fullscreen ? Icon.exitFull : Icon.full}
            </button>
          </div>
        </div>
      </header>

      <main className="stage-wrap">
        <Flipbook ref={book} pages={PAGES} soundOn={sound} onChange={handleChange} onReady={() => {
            setReady(true)
            // Build the audio engine while idle so the first page turn has nothing extra to do.
            if ('requestIdleCallback' in window) window.requestIdleCallback(warmSound, { timeout: 1500 })
            else setTimeout(warmSound, 300)
          }} />

        {!ready && (
          <div className="loading" role="status">
            <span className="spinner" aria-hidden="true" />
            Opening the invitation…
          </div>
        )}

        <button type="button" className="side-arrow left" onClick={prev} disabled={!canPrev} aria-label="Previous page">
          {Icon.prev}
        </button>
        <button type="button" className="side-arrow right" onClick={next} disabled={!canNext} aria-label="Next page">
          {Icon.next}
        </button>
      </main>

      <footer className="bottom">
        <button type="button" className="icon-btn mobile-nav" onClick={prev} disabled={!canPrev} aria-label="Previous page">
          {Icon.prev}
        </button>
        <div className="status" aria-live="polite">
          <span className="status-label">{label}</span>
          <span className="dots" aria-hidden="true">
            {Array.from({ length: state.spreadCount }, (_, i) => (
              <i key={i} className={i === state.spreadIndex ? 'on' : ''} />
            ))}
          </span>
          <span className={`hint ${touched ? 'gone' : ''}`}>
            <span className="hint-desktop">Drag a page corner or use the arrows</span>
            <span className="hint-touch">Swipe or drag the page</span>
          </span>
        </div>
        <button type="button" className="icon-btn mobile-nav" onClick={next} disabled={!canNext} aria-label="Next page">
          {Icon.next}
        </button>
      </footer>
    </div>
  )
}

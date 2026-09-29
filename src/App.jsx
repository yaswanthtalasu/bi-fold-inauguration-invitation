import { useCallback, useEffect, useRef, useState } from 'react'
import Flipbook from './Flipbook.jsx'

const base = import.meta.env.BASE_URL

// Page order requested: 2, 3, 4, 1 of the source PDF.
const PAGES = [
  { src: `${base}pages/page-1-cover.webp`, alt: 'Invitation cover: inaugural ceremony of Plus Qiskit Fall Fest 26, 5 October 2026, 2:00 PM to 3:00 PM, RGUKT Nuzvid' },
  { src: `${base}pages/page-2-schedule.webp`, alt: 'Event schedule, 5 to 9 October 2026' },
  { src: `${base}pages/page-3-speakers.webp`, alt: 'List of speakers' },
  { src: `${base}pages/page-4-about.webp`, alt: 'About RGUKT and Plus Qiskit Fall Fest 26, contact details and venue QR code' },
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
    return () => {
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
    <div className="app">
      <header className="top">
        <div className="title">
          <h1>Plus Qiskit Fall Fest ’26</h1>
          <p>Inaugural ceremony invitation</p>
        </div>
        <div className="tools">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setSound((v) => !v)}
            aria-pressed={sound}
            aria-label={sound ? 'Mute page-turn sound' : 'Turn on page-turn sound'}
            title={sound ? 'Mute page-turn sound' : 'Turn on page-turn sound'}
          >
            {sound ? Icon.soundOn : Icon.soundOff}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
            title={fullscreen ? 'Exit full screen' : 'Full screen'}
          >
            {fullscreen ? Icon.exitFull : Icon.full}
          </button>
        </div>
      </header>

      <main className="stage-wrap">
        <Flipbook ref={book} pages={PAGES} soundOn={sound} onChange={handleChange} onReady={() => setReady(true)} />

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
          <span className={`hint ${touched ? 'gone' : ''}`}>Drag a page corner or use the arrows</span>
        </div>
        <button type="button" className="icon-btn mobile-nav" onClick={next} disabled={!canNext} aria-label="Next page">
          {Icon.next}
        </button>
      </footer>
    </div>
  )
}

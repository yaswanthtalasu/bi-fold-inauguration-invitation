import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { PageFlip } from 'page-flip'
import { playFlipSound } from './sound.js'

// Natural size of each page image (width / height).
const PAGE_W = 1346
const PAGE_H = 1903
const RATIO = PAGE_W / PAGE_H
const STAGE_PAD = 16
// page-flip switches to single-page mode when the book is narrower than 2 * MIN_PAGE_W.
const MIN_PAGE_W = 200

function loadImages(pages) {
  return Promise.all(
    pages.map(
      ({ src, alt }) =>
        new Promise((resolve) => {
          const img = new Image()
          img.alt = alt
          img.draggable = false
          // Decode synchronously so a page that was display:none paints on the
          // very first frame of a flip instead of showing blank for a moment.
          img.decoding = 'sync'
          const done = () => (img.decode ? img.decode().catch(() => {}).then(() => resolve(img)) : resolve(img))
          img.onload = done
          img.onerror = () => resolve(img)
          img.src = src
        }),
    ),
  )
}

/**
 * Page-curl flipbook (StPageFlip under the hood).
 * - Drag any page corner, or click/tap a page edge, to turn it.
 * - Exposes next() / prev() for the arrow buttons and keyboard.
 * - With showCover the first and last pages sit alone, so the book slides
 *   sideways to stay centred (like the reference flipbook).
 */
const Flipbook = forwardRef(function Flipbook({ pages, soundOn, onChange, onReady }, ref) {
  const stageRef = useRef(null)
  const shiftRef = useRef(null)
  const bookRef = useRef(null)
  const soundRef = useRef(soundOn)
  const onChangeRef = useRef(onChange)
  soundRef.current = soundOn
  onChangeRef.current = onChange

  useImperativeHandle(ref, () => ({
    next: () => bookRef.current?.go(1),
    prev: () => bookRef.current?.go(-1),
  }))

  useEffect(() => {
    let cancelled = false
    let pf = null
    let observer = null
    let bookEl = null
    let animatedFlip = false
    let lastSpread = -1

    const stage = stageRef.current
    const shift = shiftRef.current

    const spreads = () => pf.getPageCollection().getSpread()
    const spreadIndex = () => pf.getPageCollection().getCurrentSpreadIndex()

    // Slide the book so a lone cover / back cover is centred on screen.
    const applyView = (spreadIdx) => {
      const list = spreads()
      const s = list[spreadIdx]
      let view = 'spread'
      if (pf.getOrientation() === 'landscape' && s && s.length === 1) {
        view = s[0] === 0 ? 'cover' : 'back'
      }
      shift.dataset.view = view
    }

    const report = () => {
      const list = spreads()
      const idx = spreadIndex()
      onChangeRef.current?.({
        pageIndex: pf.getCurrentPageIndex(),
        spreadIndex: idx,
        spreadCount: list.length,
        pageCount: pf.getPageCount(),
        mode: pf.getOrientation(),
      })
    }

    const fit = () => {
      if (!pf || !bookEl) return
      const availW = stage.clientWidth - STAGE_PAD * 2
      const availH = stage.clientHeight - STAGE_PAD * 2
      const spreadW = Math.min(availW, availH * 2 * RATIO, 1800)
      let w
      if (spreadW >= MIN_PAGE_W * 2) {
        w = spreadW // two-page spread
      } else {
        w = Math.max(MIN_PAGE_W, Math.min(availW, availH * RATIO)) // single page
      }
      bookEl.style.width = `${Math.floor(w)}px`
      bookEl.style.maxWidth = 'none'
      pf.update()
      applyView(spreadIndex())
      report()
    }

    loadImages(pages).then((imgs) => {
      if (cancelled) return

      bookEl = document.createElement('div')
      bookEl.className = 'book'
      shift.appendChild(bookEl)

      const pageEls = imgs.map((img) => {
        const div = document.createElement('div')
        div.className = 'page'
        div.appendChild(img)
        return div
      })

      pf = new PageFlip(bookEl, {
        width: PAGE_W,
        height: PAGE_H,
        size: 'stretch',
        minWidth: MIN_PAGE_W,
        maxWidth: 1400,
        minHeight: 280,
        maxHeight: 2000,
        showCover: true,
        drawShadow: true,
        maxShadowOpacity: 0.55,
        flippingTime: 900,
        usePortrait: true,
        autoSize: true,
        showPageCorners: true,
        mobileScrollSupport: false,
        swipeDistance: 24,
        startZIndex: 2,
      })
      pf.loadFromHTML(pageEls)

      // Make the cover and back cover curl like every other page.
      pf.getPageCollection()
        .getPages()
        .forEach((p) => p.setDensity('soft'))

      pf.on('changeState', (e) => {
        if (e.data === 'flipping') {
          animatedFlip = true
          if (soundRef.current) playFlipSound()
        }
      })
      pf.on('flip', () => {
        const idx = spreadIndex()
        applyView(idx)
        if (idx !== lastSpread) {
          if (lastSpread !== -1 && !animatedFlip && soundRef.current) playFlipSound()
          lastSpread = idx
        }
        animatedFlip = false
        report()
      })
      pf.on('changeOrientation', () => {
        applyView(spreadIndex())
        report()
      })

      bookRef.current = {
        go(dir) {
          const state = pf.getState()
          if (state === 'user_fold') return
          // Finish any flip in progress so rapid clicks turn one page each.
          pf.getRender().finishAnimation()
          const target = spreadIndex() + dir
          if (target < 0 || target >= spreads().length) return
          applyView(target) // slide the book in step with the curl
          if (dir > 0) pf.flipNext('bottom')
          else pf.flipPrev('bottom')
        },
      }

      observer = new ResizeObserver(fit)
      observer.observe(stage)
      lastSpread = spreadIndex()
      fit()
      onReady?.()
    })

    return () => {
      cancelled = true
      observer?.disconnect()
      bookRef.current = null
      try {
        pf?.destroy()
      } catch {
        /* already removed */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages])

  return (
    <div className="stage" ref={stageRef}>
      <div className="book-shift" ref={shiftRef} data-view="cover">
        <div className="book-shadow" aria-hidden="true" />
      </div>
    </div>
  )
})

export default Flipbook

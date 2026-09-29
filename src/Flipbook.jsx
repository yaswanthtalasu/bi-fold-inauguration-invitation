import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react'
import { PageFlip } from 'page-flip'
import { playFlipSound } from './sound.js'

// Natural size of each page image (width / height).
const PAGE_W = 1346
const PAGE_H = 1903
const RATIO = PAGE_W / PAGE_H
const STAGE_PAD = 16
// Below this stage width (phones, small tablets, phone landscape) the book shows
// ONE page at a time, still with the full page-curl animation.
const SPREAD_MIN_STAGE_W = 900
// Phones held sideways are wide but very short: keep them on one page too.
const isShortTouchScreen = (stage) =>
  window.matchMedia?.('(pointer: coarse)').matches && stage.clientHeight < 600
const wantsSpread = (stage) => stage.clientWidth >= SPREAD_MIN_STAGE_W && !isShortTouchScreen(stage)
const MIN_PAGE_W = 100

function loadImages(pages, useMd) {
  return Promise.all(
    pages.map(
      ({ src, srcMd, alt }) =>
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
          img.src = useMd ? srcMd : src
        }),
    ),
  )
}

// Ease-in-out for page turns: the library moves the corner at constant speed, which
// feels mechanical. Remapping the pre-computed frames gives a natural accelerate/settle.
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2

function addEasing(render) {
  const original = render.startAnimation.bind(render)
  render.startAnimation = (frames, duration, onEnd) => {
    const n = frames.length
    if (n < 3) return original(frames, duration, onEnd)
    const eased = new Array(n)
    for (let k = 0; k < n; k++) {
      eased[k] = frames[Math.min(n - 1, Math.round(easeInOutSine(k / (n - 1)) * (n - 1)))]
    }
    return original(eased, duration, onEnd)
  }
}

/**
 * Page-curl flipbook (StPageFlip under the hood).
 * - Drag any page corner, or click/tap a page edge, to turn it.
 * - Exposes next() / prev() for the arrow buttons and keyboard.
 * - With showCover the first and last pages sit alone, so the book slides
 *   sideways to stay centred (like the reference flipbook).
 */
const Flipbook = memo(forwardRef(function Flipbook({ pages, soundOn, onChange, onReady }, ref) {
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
    let dirty = 3 // frames still to draw after something changed
    let removeTouch = null

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
      const wantSpread = wantsSpread(stage)
      let w
      if (wantSpread) {
        w = spreadW // two-page spread
      } else {
        w = Math.max(120, Math.min(availW, availH * RATIO)) // one page
      }
      // page-flip picks single-page mode when the book is narrower than 2 * minWidth,
      // so steer that decision from here (settings are read on every update).
      pf.getSettings().minWidth = wantSpread ? MIN_PAGE_W : Math.ceil(w / 2) + 1
      bookEl.style.width = `${Math.floor(w)}px`
      bookEl.style.maxWidth = 'none'
      bookEl.style.minWidth = '0' // the library sets a min-width that would overflow small phones
      pf.update()
      dirty = 3 // resizing clears the canvas, so draw it again
      applyView(spreadIndex())
      report()
    }

    // Pick the lighter image when the page is shown small: less to decode, upload and
    // repaint on every animation frame.
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    const sW = stage.clientWidth - STAGE_PAD * 2
    const sH = stage.clientHeight - STAGE_PAD * 2
    const expectedPageW =
      wantsSpread(stage) ? Math.min(sW / 2, sH * RATIO, 900) : Math.min(sW, sH * RATIO)
    const useMd = expectedPageW * dpr <= 860

    loadImages(pages, useMd).then((imgs) => {
      if (cancelled) return

      bookEl = document.createElement('div')
      bookEl.className = 'book'
      shift.appendChild(bookEl)

      // Canvas mode: each frame is drawn into ONE GPU canvas. The HTML mode re-rasterised
      // clipped page layers and large gradient shadow layers on every frame (the lag).
      pf = new PageFlip(bookEl, {
        width: PAGE_W,
        height: PAGE_H,
        size: 'stretch',
        minWidth: MIN_PAGE_W,
        maxWidth: 1400,
        minHeight: 100,
        showCover: true,
        drawShadow: true,
        maxShadowOpacity: 0.5,
        flippingTime: 900,
        usePortrait: true,
        autoSize: true,
        showPageCorners: true,
        mobileScrollSupport: false,
        swipeDistance: 24,
      })
      pf.loadFromImages(imgs.map((i) => i.src))
      bookEl.style.minWidth = '0'

      // Reuse the images we already decoded so the first frame never waits on a load.
      pf.getPageCollection()
        .getPages()
        .forEach((page, i) => {
          page.image = imgs[i]
          page.isLoad = true
        })

      const render = pf.getRender()
      const ui = pf.getUI()
      const canvas = ui.getCanvas()
      const ctx = canvas.getContext('2d')

      // Sharp on high-DPI screens: back the canvas with device pixels.
      ui.resizeCanvas = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const cs = getComputedStyle(canvas)
        canvas.width = Math.round(parseInt(cs.width, 10) * dpr)
        canvas.height = Math.round(parseInt(cs.height, 10) * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
      // Transparent background instead of white, so the page theme shows around the book.
      render.clear = () => ctx.clearRect(0, 0, canvas.width, canvas.height)
      // The spine shadow only belongs where two pages actually meet.
      const drawSpine = render.drawBookShadow.bind(render)
      render.drawBookShadow = () => {
        if (render.leftPage && render.rightPage) drawSpine()
      }
      // Don't redraw an unchanged frame 60 times a second while idle.
      const drawFrame = render.drawFrame.bind(render)
      render.drawFrame = () => {
        if (render.animation !== null || render.flippingPage !== null || dirty > 0) {
          if (dirty > 0) dirty--
          drawFrame()
        }
      }

      addEasing(render)

      // ---- Touch: the page follows the finger straight away ----
      // The library waits 250 ms before a drag starts responding, which feels laggy.
      // Replace its touch handlers (mouse handling stays as it is).
      canvas.removeEventListener('touchstart', ui.onTouchStart)
      window.removeEventListener('touchmove', ui.onTouchMove)
      window.removeEventListener('touchend', ui.onTouchEnd)

      const posOf = (t) => {
        const r = canvas.getBoundingClientRect()
        return { x: t.clientX - r.left, y: t.clientY - r.top }
      }
      const findTouch = (e, id) => Array.from(e.changedTouches).find((t) => t.identifier === id)
      let touch = null

      const onTouchStart = (e) => {
        if (e.touches.length !== 1) return
        const t = e.changedTouches[0]
        touch = { id: t.identifier, start: posOf(t), t0: Date.now(), dragging: false }
        if (e.cancelable) e.preventDefault() // no emulated mouse events, no scrolling
      }
      const onTouchMove = (e) => {
        if (!touch) return
        const t = findTouch(e, touch.id)
        if (!t) return
        const pos = posOf(t)
        if (!touch.dragging) {
          const dx = pos.x - touch.start.x
          const dy = pos.y - touch.start.y
          if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
          if (Math.abs(dy) > Math.abs(dx) * 1.6) {
            touch = null // a vertical movement is not a page turn
            return
          }
          touch.dragging = true
          pf.startUserTouch(touch.start)
        }
        pf.userMove(pos, true)
        if (e.cancelable) e.preventDefault()
      }
      const onTouchEnd = (e) => {
        if (!touch) return
        const t = findTouch(e, touch.id)
        if (!t) return
        const pos = posOf(t)
        const { dragging, start, t0 } = touch
        touch = null
        if (!dragging) return

        const dx = pos.x - start.x
        const flick = Date.now() - t0 < 280 && Math.abs(dx) > 30
        const calc = pf.getFlipController().getCalculation()
        if (flick && calc) {
          // A quick flick completes the turn if it goes the way the page is folding:
          // push the corner past the spine so the release animation finishes the turn.
          const r = render.getRect()
          const spine = r.left + r.width / 2
          const dir = calc.getDirection() // 0 = next page, 1 = previous page
          if ((dir === 0 && dx < 0) || (dir === 1 && dx > 0)) {
            pf.userMove({ x: spine + (dir === 0 ? -24 : 24), y: pos.y }, true)
          }
        }
        pf.userStop(pos)
      }
      const onTouchCancel = () => {
        if (touch?.dragging) pf.userStop(touch.start)
        touch = null
      }
      canvas.addEventListener('touchstart', onTouchStart, { passive: false })
      window.addEventListener('touchmove', onTouchMove, { passive: false })
      window.addEventListener('touchend', onTouchEnd)
      window.addEventListener('touchcancel', onTouchCancel)
      removeTouch = () => {
        canvas.removeEventListener('touchstart', onTouchStart)
        window.removeEventListener('touchmove', onTouchMove)
        window.removeEventListener('touchend', onTouchEnd)
        window.removeEventListener('touchcancel', onTouchCancel)
      }

      // Pre-draw every page once so their textures are already on the GPU before the first
      // turn (otherwise the first flip stalls while the hidden pages upload).
      const warmPages = () => {
        if (cancelled) return
        ctx.save()
        ctx.globalAlpha = 0.01
        imgs.forEach((img) => ctx.drawImage(img, 0, 0, 4, 4))
        ctx.restore()
        dirty = 3 // clear the warm-up pixels
      }
      setTimeout(warmPages, 0)

      pf.on('changeState', (e) => {
        dirty = 3
        if (e.data === 'flipping') {
          animatedFlip = true
          if (soundRef.current) playFlipSound()
        }
      })
      pf.on('flip', () => {
        dirty = 3
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
        dirty = 3
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
      removeTouch?.()
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
}))

export default Flipbook

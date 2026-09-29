// Soft paper "swish" synthesised with WebAudio (no audio file needed).
// The AudioContext and the noise buffer are created once, in idle time (warmSound), NOT
// during a page turn: creating them mid-flip froze the first animation.
let ctx = null
let buffer = null

// Create the audio engine ahead of time (idle time, before any tap). It starts out
// suspended because browsers block audio until a gesture; primeSound() resumes it.
export function warmSound() {
  if (ctx) return
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()

    const dur = 0.45
    const len = Math.floor(ctx.sampleRate * dur)
    buffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) {
      const t = i / len
      const envelope = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.55)), 1.6)
      data[i] = (Math.random() * 2 - 1) * envelope * (0.55 + 0.45 * Math.random())
    }
  } catch {
    /* audio is optional */
  }
}

// Call from a user gesture (tap / key press).
export function primeSound() {
  warmSound()
  try {
    if (ctx && ctx.state === 'suspended') ctx.resume()
  } catch {
    /* audio is optional */
  }
}

export function playFlipSound() {
  if (!ctx || !buffer) return
  try {
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime

    const src = ctx.createBufferSource()
    src.buffer = buffer

    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.Q.value = 0.6
    band.frequency.setValueAtTime(1400, now)
    band.frequency.exponentialRampToValueAtTime(5200, now + 0.45)

    const gain = ctx.createGain()
    gain.gain.value = 0.2

    src.connect(band).connect(gain).connect(ctx.destination)
    src.start()
  } catch {
    /* audio is optional */
  }
}

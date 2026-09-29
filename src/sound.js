// A soft paper "swish" synthesised with WebAudio, so no audio file is needed.
let ctx

export function playFlipSound() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = ctx || new AC()
    if (ctx.state === 'suspended') ctx.resume()

    const dur = 0.45
    const len = Math.floor(ctx.sampleRate * dur)
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) {
      const t = i / len
      const envelope = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.55)), 1.6)
      data[i] = (Math.random() * 2 - 1) * envelope * (0.55 + 0.45 * Math.random())
    }

    const src = ctx.createBufferSource()
    src.buffer = buffer

    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.Q.value = 0.6
    const now = ctx.currentTime
    band.frequency.setValueAtTime(1400, now)
    band.frequency.exponentialRampToValueAtTime(5200, now + dur)

    const gain = ctx.createGain()
    gain.gain.value = 0.2

    src.connect(band).connect(gain).connect(ctx.destination)
    src.start()
  } catch {
    /* audio is optional */
  }
}

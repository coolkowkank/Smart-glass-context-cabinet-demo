// The agent's voice: reads captions aloud with the browser's speech synthesis.
// Silently does nothing where speech synthesis isn't available.

// Make glasses shorthand sound natural when spoken.
export function speakable(text) {
  return text
    .replace(/▌/g, '')
    .replace(/€(\d+)k\b/g, '$1 thousand euros')
    .replace(/€([\d,]+)/g, '$1 euros')
    .replace(/~\s?/g, 'about ')
    .replace(/\s*→\s*/g, ', and you get there in ')
    .replace(/\bmo\b/g, 'months')
    .replace(/\s+/g, ' ')
    .trim()
}

export function speak(text, { lang = 'en-US', rate = 1.04 } = {}) {
  const synth = typeof window !== 'undefined' && window.speechSynthesis
  if (!synth || !text) return
  try {
    synth.cancel()
    const u = new SpeechSynthesisUtterance(speakable(text))
    u.lang = lang
    u.rate = rate
    const voice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('en') && /natural|neural|google|samantha|daniel/i.test(v.name))
      || synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('en'))
    if (voice) u.voice = voice
    synth.speak(u)
  } catch {
    /* speech is optional */
  }
}

export function stopSpeaking() {
  try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
}

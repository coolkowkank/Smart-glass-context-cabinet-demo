// One-shot speech recognition via the browser's Web Speech API.
// Supported in Chrome/Edge (and Safari with Siri enabled). Needs https or localhost.
export const speechSupported = () =>
  typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)

export function listenOnce({ timeoutMs = 7000, lang = 'en-US' } = {}) {
  return new Promise((resolve, reject) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return reject(new Error('unsupported'))
    const rec = new SR()
    rec.lang = lang
    rec.interimResults = false
    rec.maxAlternatives = 1
    let done = false
    const finish = (fn, v) => { if (!done) { done = true; clearTimeout(timer); fn(v) } }
    const timer = setTimeout(() => { rec.abort(); finish(reject, new Error('timeout')) }, timeoutMs)
    rec.onresult = (e) => finish(resolve, e.results[0][0].transcript)
    rec.onerror = (e) => finish(reject, new Error(e.error || 'error'))
    rec.onend = () => finish(reject, new Error('no-speech'))
    rec.start()
  })
}

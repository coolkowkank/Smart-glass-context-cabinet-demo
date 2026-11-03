// Cross-window sync for the three-window demo (one computer, one origin, no backend).
// Window 1 (glasses) is the source; window 2 (follow mode) and window 3 (chat) listen.
// Messages: hello, snapshot, caption, moment, state, reset. See team/batches/batch-2-window-3-chat.md.

export const CHANNEL = 'smartglass-demo'
export const VERSION = 1

// open(onMessage) -> { post(msg), close() }. Safe where BroadcastChannel is missing (no-op).
// Create it inside an effect and call close() in the cleanup (StrictMode mounts twice).
export function openBus(onMessage = () => {}) {
  if (typeof BroadcastChannel === 'undefined') return { post() {}, close() {} }
  const ch = new BroadcastChannel(CHANNEL)
  ch.onmessage = (e) => {
    const d = e.data
    if (d && d.v === VERSION && typeof d.type === 'string') onMessage(d)
  }
  return {
    post(msg) { try { ch.postMessage({ v: VERSION, ...JSON.parse(JSON.stringify(msg)) }) } catch (err) { console.error('bus post failed', err) } },
    close() { ch.onmessage = null; ch.close() },
  }
}

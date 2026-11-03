// Pure chat-thread reducer shared by window 1 (keeps the log it sends in snapshots)
// and window 3 (renders it). Thread = [{ m, key, dim, text }] in order.
// dim = Lauri's own voice (user bubble); otherwise the agent's (agent bubble).

export const captionText = (cap) => (cap?.parts || []).map((p) => p.text).join('')

export function reduceThread(thread, ev) {
  switch (ev?.type) {
    case 'reset': return []
    case 'snapshot': return Array.isArray(ev.thread) ? ev.thread : []
    // Entering moment m replays its captions: drop that moment and anything later (going back).
    case 'moment': return thread.filter((x) => x.m < ev.m)
    case 'caption': {
      if (!ev.text || !ev.text.trim()) return thread
      const msg = { m: ev.m, key: ev.key, dim: !!ev.dim, text: ev.text }
      const i = thread.findIndex((x) => x.m === msg.m && x.key === msg.key)
      if (i === -1) return [...thread, msg]
      if (thread[i].text === msg.text && thread[i].dim === msg.dim) return thread
      return thread.map((x, j) => (j === i ? msg : x))
    }
    default: return thread
  }
}

// Pure layout for the Agent Brain view.
//   Distance = relevance: active → inner ring, needs review → middle ring,
//   stale → outer "Rusty Orbit", archived → the Archive tray.
//   Side = ownership: declared by Lauri → left, inferred by Nordea → right.

export const RINGS = [
  { key: 'active', label: 'Active', rx: 0.2, ry: 0.15 },
  { key: 'review', label: 'Needs review', rx: 0.3, ry: 0.225 },
  { key: 'rusty', label: 'Rusty Orbit', rx: 0.4, ry: 0.3 },
]

export const ringOf = (e) =>
  e.status === 'archived' ? 'archive' : e.status === 'stale' ? 2 : e.status === 'needs_review' ? 1 : 0
export const sideOf = (e) => (e.source === 'customer' ? 'left' : 'right')
export const labelOf = (e) => e.data?.orb_label || e.title

// Pill size from the label. `measure(label, px)` returns text width in px
// (the UI passes a canvas measurer); without it we estimate. A label that
// doesn't fit in maxW wraps onto two lines instead of being cut off.
export const pillSize = (label, compact, measure, maxW = compact ? 190 : 300) => {
  const px = compact ? 14 : 15
  const m = measure ? (t) => measure(t, px) : (t) => t.length * (compact ? 7.4 : 8.2)
  const text = m(label)
  const chrome = (compact ? 5 + 24 + 7 + 12 + 14 : 6 + 28 + 9 + 14 + 16) + 8 // padding, sphere, gaps, review flag, borders
  if (text + chrome <= maxW) return { w: Math.ceil(text + chrome), h: compact ? 36 : 42, lines: 1 }
  // Narrowest width at which the label wraps onto at most two lines.
  const words = label.split(' ')
  const linesAt = (inner) => {
    let lines = 1
    let cur = ''
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w
      if (m(next) <= inner || !cur) cur = next
      else { lines += 1; cur = w }
    }
    return lines
  }
  let inner = Math.ceil(text / 2)
  while (inner + chrome < maxW && linesAt(inner) > 2) inner += 4
  return { w: Math.min(maxW, Math.ceil(inner + chrome)), h: compact ? 52 : 58, lines: 2 }
}

// deck: pixels reserved at the bottom for the sync airlock's card deck. The orbit
// then shrinks into the space above it so the cards never cover a memory.
export function geometry(W, H, { deck = 0 } = {}) {
  const compact = W < 640
  const cx = W / 2
  const coreR = compact ? 40 : 56
  const tray = { w: Math.min(520, W - 32), h: compact ? 64 : 72 }
  tray.x = (W - tray.w) / 2
  tray.y = H - tray.h - (compact ? 20 : 24)
  const pillMax = compact ? Math.floor((W - 32 - 8) / 2) : 300
  const span = { x: Math.min(W, 1400), y: Math.min(H, 900) }
  let cy
  let ryScale
  let bounds
  if (deck > 0) {
    const top = compact ? 132 : 112
    const bottom = H - deck - 10
    cy = (top + bottom) / 2
    ryScale = ((bottom - top) / 2) / (0.3 * span.y)
    bounds = { top, bottom }
  } else {
    cy = H * (compact ? 0.44 : 0.45)
    ryScale = compact ? 0.85 : 1
    bounds = { top: 110, bottom: tray.y - (compact ? 90 : 70) }
  }
  const rings = RINGS.map((r) => ({ ...r, rx: r.rx * span.x * (compact ? 0.95 : 1), ry: r.ry * span.y * ryScale }))
  // The core plus its label underneath: no memory may sit on top of it. (No label in deck mode.)
  const coreBox = { l: cx - (compact ? 92 : 120), r: cx + (compact ? 92 : 120), t: cy - coreR - 16, b: cy + coreR + (deck > 0 ? 14 : 116) }
  if (deck > 0) { coreBox.l = cx - coreR - 14; coreBox.r = cx + coreR + 14 }
  return { W, H, cx, cy, rings, coreR, coreBox, compact, tray, pillMax, bounds, deck }
}

export function slotAngles(n, ring) {
  if (n === 1) return [ring === 2 ? -28 : ring === 1 ? 16 : 0]
  const spread = Math.min(120, 46 * (n - 1))
  return Array.from({ length: n }, (_, i) => -spread / 2 + (spread * i) / (n - 1) + (ring === 1 ? 14 : 0))
}

export function layout(entries, g, measure) {
  const groups = {}
  const items = []
  const archived = []
  for (const e of entries) {
    const ring = ringOf(e)
    if (ring === 'archive') { archived.push(e); continue }
    const k = `${sideOf(e)}${ring}`
    ;(groups[k] ||= []).push(e)
  }
  for (const [k, list] of Object.entries(groups)) {
    const side = k.startsWith('left') ? 'left' : 'right'
    const ring = Number(k.slice(-1))
    const r = g.rings[ring]
    slotAngles(list.length, ring).forEach((deg, i) => {
      const a = (deg * Math.PI) / 180
      const dir = side === 'left' ? -1 : 1
      const e = list[i]
      items.push({
        id: e.id, side, ring, entry: e, label: labelOf(e), size: pillSize(labelOf(e), g.compact, measure, g.pillMax),
        x: g.cx + dir * r.rx * Math.cos(a), y: g.cy + r.ry * Math.sin(a), phase: (i + ring * 2.3) * 1.7,
      })
    })
  }
  relax(items, g)
  // Archived pills sit in a row inside the tray.
  const gap = 8
  const sizes = archived.map((e) => pillSize(labelOf(e), true, measure, Math.min(190, (g.tray.w - 24) / Math.max(1, archived.length))))
  const total = sizes.reduce((s, z) => s + z.w, 0) + gap * Math.max(0, archived.length - 1)
  let x = g.W / 2 - total / 2
  archived.forEach((e, i) => {
    items.push({ id: e.id, side: sideOf(e), ring: 'archive', entry: e, label: labelOf(e), size: sizes[i],
      x: x + sizes[i].w / 2, y: g.tray.y + g.tray.h / 2 + 8, phase: i })
    x += sizes[i].w + gap
  })
  return items
}

// Push overlapping pills apart (and away from the core), then keep them on screen.
export function relax(items, g, iterations = 80) {
  const pad = 8
  const { top, bottom } = g.bounds
  const side = g.compact ? 16 : 32
  const clamp = (a) => {
    a.x = Math.max(side + a.size.w / 2, Math.min(g.W - side - a.size.w / 2, a.x))
    a.y = Math.max(top + a.size.h / 2, Math.min(bottom - a.size.h / 2, a.y))
  }
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < items.length; i++) {
      const a = items[i]
      for (let j = i + 1; j < items.length; j++) {
        const b = items[j]
        const ox = (a.size.w + b.size.w) / 2 + pad - Math.abs(a.x - b.x)
        const oy = (a.size.h + b.size.h) / 2 + pad - Math.abs(a.y - b.y)
        if (ox > 0 && oy > 0) {
          // Opposite hemispheres slide sideways apart; same side stacks vertically.
          if (a.side !== b.side && a.size.w + b.size.w + pad + 32 <= g.W) {
            const s = a.x <= b.x ? -1 : 1
            a.x += (s * ox) / 2
            b.x -= (s * ox) / 2
          } else {
            const s = a.y <= b.y ? -1 : 1
            a.y += (s * oy) / 2
            b.y -= (s * oy) / 2
          }
          clamp(a)
          clamp(b)
        }
      }
      pushOutOfBox(a, g.coreBox, g)
      clamp(a)
    }
  }
  return items
}

// Move a pill out of a box along the cheaper axis, unless that would leave the screen.
function pushOutOfBox(a, box, g) {
  const l = a.x - a.size.w / 2, r = a.x + a.size.w / 2, t = a.y - a.size.h / 2, b = a.y + a.size.h / 2
  if (r <= box.l || l >= box.r || b <= box.t || t >= box.b) return
  const dx = a.x < g.cx ? box.l - r - 6 : box.r - l + 6
  const dy = a.y < (box.t + box.b) / 2 ? box.t - b - 6 : box.b - t + 6
  const fitsX = a.x + dx - a.size.w / 2 >= 16 && a.x + dx + a.size.w / 2 <= g.W - 16
  if (fitsX && Math.abs(dx) <= Math.abs(dy)) a.x += dx
  else a.y += dy
}

// Where an orb goes while desyncing: flung outward past the screen edge.
export function flungPosition(item, g) {
  const dx = item.x - g.cx || (item.side === 'left' ? -1 : 1)
  const dy = item.y - g.cy
  const len = Math.hypot(dx, dy) || 1
  const reach = Math.hypot(g.W, g.H) * 0.62
  return { x: g.cx + (dx / len) * reach, y: g.cy + (dy / len) * reach }
}

export const inTray = (p, g) =>
  p.x > g.tray.x - 20 && p.x < g.tray.x + g.tray.w + 20 && p.y > g.tray.y - 30 && p.y < g.tray.y + g.tray.h + 20

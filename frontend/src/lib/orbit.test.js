import { describe, expect, it } from 'vitest'
import seed from '../../../shared/lauri.json'
import sync from '../../../shared/personal_agent_sync.json'

// The Cabinet once the Personal AI's flat goal has been approved.
const flatEntry = { ...sync.proposals.find((p) => p.id === 'sync-flat').entry, synced_via: 'personal_ai' }
const ENTRIES = [flatEntry, ...seed.entries]
import { flungPosition, geometry, inTray, layout } from './orbit'

const byId = (items) => Object.fromEntries(items.map((i) => [i.id, i]))

describe.each([[1440, 860], [1280, 720], [390, 844], [768, 1024]])('orbit layout at %ix%i', (W, H) => {
  const g = geometry(W, H)
  const items = byId(layout(ENTRIES, g))

  it('puts ownership on the right side', () => {
    expect(items.flat.side).toBe('left')
    expect(items.car.side).toBe('left')
    for (const id of ['salary', 'asp', 'dining']) expect(items[id].side).toBe('right')
    expect(items.flat.x).toBeLessThan(g.cx)
    expect(items.salary.x).toBeGreaterThan(g.cx)
  })

  it('maps freshness to distance', () => {
    expect(items.flat.ring).toBe(0)
    expect(items.dining.ring).toBe(1)
    expect(items.car.ring).toBe(2)
    const d = (i) => Math.hypot((i.x - g.cx) / g.rings[2].rx, (i.y - g.cy) / g.rings[2].ry)
    expect(d(items.car)).toBeGreaterThan(d(items.flat))
  })

  it('keeps pills apart and on screen', () => {
    const list = Object.values(items)
    for (const a of list) {
      expect(a.x - a.size.w / 2).toBeGreaterThanOrEqual(15)
      expect(a.x + a.size.w / 2).toBeLessThanOrEqual(W - 15)
      for (const b of list) {
        if (a === b) continue
        const overlap = Math.abs(a.x - b.x) < (a.size.w + b.size.w) / 2 && Math.abs(a.y - b.y) < (a.size.h + b.size.h) / 2
        expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false)
      }
    }
  })

  it('never covers the core or its label', () => {
    const b = g.coreBox
    for (const a of Object.values(items)) {
      if (a.ring === 'archive') continue
      const hit = a.x + a.size.w / 2 > b.l && a.x - a.size.w / 2 < b.r && a.y + a.size.h / 2 > b.t && a.y - a.size.h / 2 < b.b
      expect(hit, `${a.id} covers the core`).toBe(false)
    }
  })

  it('sends archived entries to the tray and flings orbs off screen', () => {
    const archived = ENTRIES.map((e) => (e.id === 'car' ? { ...e, status: 'archived' } : e))
    const car = byId(layout(archived, g)).car
    expect(car.ring).toBe('archive')
    expect(inTray(car, g)).toBe(true)
    const p = flungPosition(items.flat, g)
    expect(p.x < 0 || p.y < 0 || p.y > H).toBe(true)
  })
})

describe.each([[1280, 720], [390, 844]])('deck mode at %ix%i (sync airlock open)', (W, H) => {
  const deck = W < 640 ? 330 : 280
  const g = geometry(W, H, { deck })
  const items = layout(ENTRIES, g).filter((i) => i.ring !== 'archive')
  it('keeps every memory above the card deck and apart', () => {
    for (const a of items) {
      expect(a.y + a.size.h / 2, a.id).toBeLessThanOrEqual(H - deck)
      for (const b of items) {
        if (a === b) continue
        const overlap = Math.abs(a.x - b.x) < (a.size.w + b.size.w) / 2 && Math.abs(a.y - b.y) < (a.size.h + b.size.h) / 2
        expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false)
      }
    }
  })
})
